import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  ActionAvailabilityMap,
  ControlAction,
  ControlActionResult,
  ControlSource,
  DetectionStatus,
  DevicePollingSnapshot,
  DeviceStatusDto,
  DeviceId,
  DevicesState,
  LogEntry,
} from "../types";
import { GestureSignal } from "../types";
import {
  ACTION_CONFIG,
  GESTURE_TO_ACTION,
  INITIAL_DEVICES,
  MANUAL_SECTIONS,
  MAX_LOG_ENTRIES,
  VOICE_STATUS_PLACEHOLDER,
} from "../config/controlConfig";
import { createDeviceCards, createDeviceSummaries } from "../utils/deviceViewModel";
import { buildLogSummaryItems, buildTimelineItems } from "../utils/logging";

const POLL_INTERVAL_MS = 1000;
const AMBIENT_TEMPERATURE = 26;
const KETTLE_TARGET_TEMPERATURE = 100;
const KETTLE_BOIL_SECONDS = 90;
const KETTLE_REFILL_SECONDS = 5;
const KETTLE_HEAT_RATE = 4;
const KETTLE_COOL_RATE = 2;
const KETTLE_HOT_THRESHOLD = 60;

const ESPRESSO_SECONDS = 25;
const LUNGO_SECONDS = 35;

const OVEN_PREHEAT_TARGET = 180;
const OVEN_HEAT_SECONDS = 150;
const OVEN_MIN_TEMPERATURE = 80;
const OVEN_MAX_TEMPERATURE = 260;
const OVEN_MIN_HEAT_SECONDS = 30;
const OVEN_MAX_HEAT_SECONDS = 600;
const OVEN_PREHEAT_RATE = 10;
const OVEN_COOL_RATE = 3;

interface SimulationConfig {
  oven: {
    targetTemperature: number;
    heatDuration: number;
  };
}

const DEFAULT_SIMULATION_CONFIG: SimulationConfig = {
  oven: {
    targetTemperature: OVEN_PREHEAT_TARGET,
    heatDuration: OVEN_HEAT_SECONDS,
  },
};

const createLogId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
};

const cloneDevicesState = (state: DevicesState): DevicesState => ({
  kettle: { ...state.kettle },
  coffee: { ...state.coffee },
  oven: { ...state.oven },
});

const decrementTimer = (value: number | null, step: number) => {
  if (typeof value !== "number") {
    return value;
  }
  return Math.max(0, value - step);
};

interface ActionValidation {
  ok: boolean;
  reason?: string;
}

const passValidation: ActionValidation = { ok: true };

const failValidation = (reason: string): ActionValidation => ({ ok: false, reason });

const validateAction = (state: DevicesState, action: ControlAction): ActionValidation => {
  switch (action) {
    case "kettle_start": {
      if (state.kettle.status === "water-empty") {
        return failValidation("Kettle requires water before boiling.");
      }
      if (state.kettle.status === "boiling") {
        return failValidation("Kettle is already boiling.");
      }
      return passValidation;
    }
    case "kettle_ready":
      return passValidation;
    case "kettle_stop": {
      if (!(["boiling", "cooling", "ready"] as DevicesState["kettle"]["status"][]).includes(state.kettle.status)) {
        return failValidation("Kettle is not active.");
      }
      return passValidation;
    }
    case "kettle_empty":
      return passValidation;
    case "kettle_refill":
      if (state.kettle.status !== "water-empty") {
        return failValidation("Kettle is not empty.");
      }
      return passValidation;
    case "coffee_activate": {
      if (state.coffee.status === "needs-capsule") {
        return failValidation("Load a capsule before activating.");
      }
      if (state.coffee.status === "brewing") {
        return failValidation("Coffee is currently brewing.");
      }
      return passValidation;
    }
    case "coffee_select_espresso":
    case "coffee_select_lungo": {
      if (state.coffee.status === "needs-capsule") {
        return failValidation("Cannot brew without a capsule.");
      }
      if (state.coffee.status === "brewing") {
        return failValidation("Brewing already in progress.");
      }
      if (state.coffee.status !== "waiting-selection") {
        return failValidation("Activate the machine before selecting a size.");
      }
      return passValidation;
    }
    case "coffee_cancel": {
      if (!(["waiting-selection", "brewing"] as DevicesState["coffee"]["status"][]).includes(state.coffee.status)) {
        return failValidation("Nothing to cancel on the coffee maker.");
      }
      return passValidation;
    }
    case "coffee_capsule_empty":
      return passValidation;
    case "coffee_capsule_load": {
      if (state.coffee.status !== "needs-capsule") {
        return failValidation("Capsule already loaded.");
      }
      return passValidation;
    }
    case "oven_preheat": {
      if (state.oven.status === "preheating") {
        return failValidation("Oven is already preheating.");
      }
      if (state.oven.status === "heating") {
        return failValidation("Stop heating before preheating again.");
      }
      if (state.oven.status === "ready") {
        return failValidation("Oven is already at target temperature.");
      }
      return passValidation;
    }
    case "oven_start_heat": {
      if (state.oven.status === "preheating") {
        return failValidation("Wait for preheating to finish before heating.");
      }
      if (state.oven.status !== "ready") {
        return failValidation("Preheat the oven before starting a timed heat.");
      }
      return passValidation;
    }
    case "oven_stop": {
      if (!(["preheating", "heating", "ready"] as DevicesState["oven"]["status"][]).includes(state.oven.status)) {
        return failValidation("Oven is already idle.");
      }
      return passValidation;
    }
    case "stop_all":
      return passValidation;
    default:
      return passValidation;
  }
};

const describeDeviceConstraint = (state: DevicesState, deviceId: DeviceId): string | null => {
  switch (deviceId) {
    case "kettle":
      if (state.kettle.status === "refilling") {
        return "Refilling";
      }
      if (state.kettle.status === "water-empty") {
        return "Needs water";
      }
      return null;
    case "coffee":
      if (state.coffee.status === "needs-capsule") {
        return "Capsule required";
      }
      if (state.coffee.status === "brewing") {
        return "Brewing in progress";
      }
      return null;
    case "oven":
      if (state.oven.status === "preheating") {
        return "Preheating";
      }
      if (state.oven.status === "heating") {
        return "Heating";
      }
      return null;
    default:
      return null;
  }
};

const buildActionAvailability = (state: DevicesState): ActionAvailabilityMap => {
  const entries = {} as ActionAvailabilityMap;
  (Object.keys(ACTION_CONFIG) as ControlAction[]).forEach((action) => {
    const validation = validateAction(state, action);
    entries[action] = {
      available: validation.ok,
      reason: validation.reason,
    };
  });
  return entries;
};

const applyActionToDevices = (
  state: DevicesState,
  action: ControlAction,
  config: SimulationConfig,
): DevicesState => {
  const next = cloneDevicesState(state);

  switch (action) {
    case "kettle_start": {
      next.kettle.status = "boiling";
      next.kettle.targetTemperature = KETTLE_TARGET_TEMPERATURE;
      next.kettle.timeTotal = KETTLE_BOIL_SECONDS;
      next.kettle.timeRemaining = KETTLE_BOIL_SECONDS;
      if (next.kettle.temperature < AMBIENT_TEMPERATURE) {
        next.kettle.temperature = AMBIENT_TEMPERATURE;
      }
      break;
    }
    case "kettle_ready": {
      next.kettle.status = "ready";
      next.kettle.timeTotal = null;
      next.kettle.timeRemaining = null;
      next.kettle.temperature = Math.max(next.kettle.temperature, KETTLE_HOT_THRESHOLD);
      break;
    }
    case "kettle_stop": {
      next.kettle.status = "idle";
      next.kettle.timeRemaining = null;
      next.kettle.timeTotal = null;
      break;
    }
    case "kettle_empty": {
      next.kettle.status = "water-empty";
      next.kettle.timeRemaining = null;
      next.kettle.timeTotal = null;
      next.kettle.temperature = AMBIENT_TEMPERATURE;
      break;
    }
    case "kettle_refill": {
      next.kettle.status = "refilling";
      next.kettle.timeTotal = KETTLE_REFILL_SECONDS;
      next.kettle.timeRemaining = KETTLE_REFILL_SECONDS;
      next.kettle.temperature = AMBIENT_TEMPERATURE;
      break;
    }
    case "coffee_activate": {
      if (next.coffee.status !== "needs-capsule") {
        next.coffee.status = "waiting-selection";
        next.coffee.selectedSize = null;
        next.coffee.timeRemaining = null;
        next.coffee.timeTotal = null;
      }
      break;
    }
    case "coffee_select_espresso": {
      if (next.coffee.status !== "needs-capsule") {
        next.coffee.status = "brewing";
        next.coffee.selectedSize = "espresso";
        next.coffee.timeTotal = ESPRESSO_SECONDS;
        next.coffee.timeRemaining = ESPRESSO_SECONDS;
      }
      break;
    }
    case "coffee_select_lungo": {
      if (next.coffee.status !== "needs-capsule") {
        next.coffee.status = "brewing";
        next.coffee.selectedSize = "lungo";
        next.coffee.timeTotal = LUNGO_SECONDS;
        next.coffee.timeRemaining = LUNGO_SECONDS;
      }
      break;
    }
    case "coffee_cancel": {
      next.coffee.status = "idle";
      next.coffee.selectedSize = null;
      next.coffee.timeRemaining = null;
      next.coffee.timeTotal = null;
      break;
    }
    case "coffee_capsule_empty": {
      next.coffee.status = "needs-capsule";
      next.coffee.selectedSize = null;
      next.coffee.timeRemaining = null;
      next.coffee.timeTotal = null;
      break;
    }
    case "coffee_capsule_load": {
      next.coffee.status = "idle";
      next.coffee.selectedSize = null;
      next.coffee.timeRemaining = null;
      next.coffee.timeTotal = null;
      break;
    }
    case "oven_preheat": {
      next.oven.status = "preheating";
      next.oven.targetTemperature = config.oven.targetTemperature;
      next.oven.timeRemaining = null;
      next.oven.timeTotal = null;
      break;
    }
    case "oven_start_heat": {
      next.oven.status = "heating";
      next.oven.targetTemperature = config.oven.targetTemperature;
      next.oven.timeTotal = config.oven.heatDuration;
      next.oven.timeRemaining = config.oven.heatDuration;
      if (next.oven.temperature < config.oven.targetTemperature) {
        next.oven.temperature = Math.max(
          next.oven.temperature,
          config.oven.targetTemperature - 10,
        );
      }
      break;
    }
    case "oven_stop": {
      next.oven.status = "idle";
      next.oven.timeRemaining = null;
      next.oven.timeTotal = null;
      break;
    }
    case "stop_all": {
      next.kettle = {
        ...next.kettle,
        status: "idle",
        timeRemaining: null,
        timeTotal: null,
      };
      next.coffee = {
        ...next.coffee,
        status: next.coffee.status === "needs-capsule" ? "needs-capsule" : "idle",
        selectedSize: null,
        timeRemaining: null,
        timeTotal: null,
      };
      next.oven = {
        ...next.oven,
        status: "idle",
        timeRemaining: null,
        timeTotal: null,
      };
      break;
    }
    default:
      break;
  }

  return next;
};

const advanceDevices = (state: DevicesState, config: SimulationConfig): DevicesState => {
  const next = cloneDevicesState(state);

  if (next.kettle.status === "refilling") {
    next.kettle.timeTotal = KETTLE_REFILL_SECONDS;
    next.kettle.timeRemaining = decrementTimer(next.kettle.timeRemaining, 1);
    if (next.kettle.timeRemaining === 0) {
      next.kettle.status = "ready";
      next.kettle.temperature = Math.max(next.kettle.temperature, KETTLE_HOT_THRESHOLD);
      next.kettle.timeRemaining = null;
      next.kettle.timeTotal = null;
    }
  } else if (next.kettle.status === "boiling") {
    next.kettle.timeTotal = next.kettle.timeTotal ?? KETTLE_BOIL_SECONDS;
    next.kettle.timeRemaining = decrementTimer(next.kettle.timeRemaining, 1);
    next.kettle.temperature = Math.min(
      KETTLE_TARGET_TEMPERATURE,
      next.kettle.temperature + KETTLE_HEAT_RATE,
    );
    if (next.kettle.timeRemaining === 0 || next.kettle.temperature >= KETTLE_TARGET_TEMPERATURE) {
      next.kettle.status = "ready";
      next.kettle.timeRemaining = 0;
      next.kettle.temperature = KETTLE_TARGET_TEMPERATURE;
    }
  } else if (next.kettle.status === "ready") {
    next.kettle.temperature = Math.max(
      AMBIENT_TEMPERATURE,
      next.kettle.temperature - KETTLE_COOL_RATE,
    );
    if (next.kettle.temperature <= KETTLE_HOT_THRESHOLD) {
      next.kettle.status = "cooling";
    }
  } else if (next.kettle.status === "cooling") {
    next.kettle.temperature = Math.max(
      AMBIENT_TEMPERATURE,
      next.kettle.temperature - KETTLE_COOL_RATE,
    );
    if (next.kettle.temperature <= AMBIENT_TEMPERATURE + 1) {
      next.kettle.status = "idle";
      next.kettle.timeRemaining = null;
      next.kettle.timeTotal = null;
    }
  }

  if (next.coffee.status === "brewing") {
    next.coffee.timeRemaining = decrementTimer(next.coffee.timeRemaining, 1);
    if (next.coffee.timeRemaining === 0) {
      next.coffee.timeRemaining = 0;
      next.coffee.timeTotal = next.coffee.timeTotal ?? (next.coffee.selectedSize === "lungo" ? LUNGO_SECONDS : ESPRESSO_SECONDS);
      next.coffee.lastSize = next.coffee.selectedSize ?? next.coffee.lastSize ?? "espresso";
      next.coffee.status = "ready";
    }
  }

  if (next.oven.status === "preheating") {
    next.oven.temperature = Math.min(
      next.oven.targetTemperature,
      next.oven.temperature + OVEN_PREHEAT_RATE,
    );
    if (next.oven.temperature >= next.oven.targetTemperature) {
      next.oven.temperature = next.oven.targetTemperature;
      next.oven.status = "ready";
    }
  } else if (next.oven.status === "heating") {
    next.oven.timeTotal = next.oven.timeTotal ?? config.oven.heatDuration;
    next.oven.timeRemaining = decrementTimer(next.oven.timeRemaining, 1);
    if (next.oven.temperature < next.oven.targetTemperature) {
      next.oven.temperature = Math.min(next.oven.targetTemperature, next.oven.temperature + OVEN_PREHEAT_RATE / 2);
    }
    if (next.oven.timeRemaining === 0) {
      next.oven.status = "ready";
      next.oven.timeRemaining = 0;
      next.oven.temperature = next.oven.targetTemperature;
    }
  } else {
    if (next.oven.temperature > AMBIENT_TEMPERATURE + 5) {
      next.oven.temperature = Math.max(
        AMBIENT_TEMPERATURE,
        next.oven.temperature - OVEN_COOL_RATE,
      );
    }
    if (next.oven.status === "ready" && next.oven.temperature <= AMBIENT_TEMPERATURE + 2) {
      next.oven.status = "idle";
      next.oven.timeRemaining = null;
      next.oven.timeTotal = null;
    }
  }

  return next;
};

const devicesToDto = (state: DevicesState, timestamp: string): DeviceStatusDto[] => [
  {
    id: "kettle",
    status: state.kettle.status,
    remainingSeconds: state.kettle.timeRemaining,
    totalSeconds: state.kettle.timeTotal,
    temperature: state.kettle.temperature,
    targetTemperature: state.kettle.targetTemperature,
    constraint: describeDeviceConstraint(state, "kettle"),
    updatedAt: timestamp,
  },
  {
    id: "coffee",
    status: state.coffee.status,
    remainingSeconds: state.coffee.timeRemaining,
    totalSeconds: state.coffee.timeTotal,
    selectedSize: state.coffee.selectedSize,
    lastSize: state.coffee.lastSize,
    constraint: describeDeviceConstraint(state, "coffee"),
    updatedAt: timestamp,
  },
  {
    id: "oven",
    status: state.oven.status,
    remainingSeconds: state.oven.timeRemaining,
    totalSeconds: state.oven.timeTotal,
    temperature: state.oven.temperature,
    targetTemperature: state.oven.targetTemperature,
    constraint: describeDeviceConstraint(state, "oven"),
    updatedAt: timestamp,
  },
];

const createSnapshot = (state: DevicesState): DevicePollingSnapshot => {
  const fetchedAt = new Date().toISOString();
  return {
    devices: devicesToDto(state, fetchedAt),
    fetchedAt,
  };
};

interface ControlManagerApi {
  deviceSummaries: ReturnType<typeof createDeviceSummaries>;
  deviceCards: ReturnType<typeof createDeviceCards>;
  detectionStatus: DetectionStatus;
  setDetectionStatus: (status: DetectionStatus) => void;
  logSummaryItems: ReturnType<typeof buildLogSummaryItems>;
  timelineItems: ReturnType<typeof buildTimelineItems>;
  logCount: number;
  manualSections: typeof MANUAL_SECTIONS;
  actionAvailability: ActionAvailabilityMap;
  performAction: (action: ControlAction, source?: ControlSource) => ControlActionResult;
  handleManualAction: (action: ControlAction) => ControlActionResult;
  handleStopAll: () => void;
  handleGestureSignal: (signal: GestureSignal) => ControlActionResult | null;
  handleClearLog: () => void;
  handleExportLog: () => void;
  refreshDeviceStatus: () => Promise<DevicePollingSnapshot>;
  latestSnapshot: DevicePollingSnapshot | null;
  lastActionResult: ControlActionResult | null;
  ovenSettings: SimulationConfig["oven"];
  updateOvenSettings: (settings: SimulationConfig["oven"]) => void;
  resetOvenSettings: () => void;
}

export const useControlManager = (): ControlManagerApi => {
  const [devices, setDevices] = useState<DevicesState>(() => cloneDevicesState(INITIAL_DEVICES));
  const backendStateRef = useRef<DevicesState>(cloneDevicesState(INITIAL_DEVICES));
  const [detectionStatus, setDetectionStatus] = useState<DetectionStatus>({
    gesture: "NONE",
    voice: VOICE_STATUS_PLACEHOLDER,
  });
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [latestSnapshot, setLatestSnapshot] = useState<DevicePollingSnapshot | null>(null);
  const [lastActionResult, setLastActionResult] = useState<ControlActionResult | null>(null);
  const [simulationConfig, setSimulationConfig] = useState<SimulationConfig>(() => ({
    oven: { ...DEFAULT_SIMULATION_CONFIG.oven },
  }));

  const appendLog = useCallback((action: ControlAction, message: string, source: ControlSource) => {
    setLogEntries((prev) => {
      const entry: LogEntry = {
        id: createLogId(),
        timestamp: new Date().toISOString(),
        action,
        message,
        source,
      };
      const nextEntries = [...prev, entry];
      return nextEntries.slice(-MAX_LOG_ENTRIES);
    });
  }, []);

  const refreshDeviceStatus = useCallback(async () => {
    backendStateRef.current = advanceDevices(backendStateRef.current, simulationConfig);
    const snapshot = createSnapshot(backendStateRef.current);
    setLatestSnapshot(snapshot);
    setDevices(cloneDevicesState(backendStateRef.current));
    return snapshot;
  }, [simulationConfig]);

  const performAction = useCallback(
    (action: ControlAction, source: ControlSource = "manual") => {
      const config = ACTION_CONFIG[action];
      if (!config) {
        const result: ControlActionResult = {
          success: false,
          message: "Unknown action.",
          level: "warning",
        };
        setLastActionResult(result);
        return result;
      }

      const validation = validateAction(backendStateRef.current, action);
      if (!validation.ok) {
        const reason = validation.reason ?? "Action blocked.";
        const rejectedMessage = `[Rejected] ${config.message}: ${reason}`;
        appendLog(action, rejectedMessage, source);
        const result: ControlActionResult = {
          success: false,
          message: reason,
          level: "warning",
        };
        setLastActionResult(result);
        return result;
      }

      backendStateRef.current = applyActionToDevices(
        backendStateRef.current,
        action,
        simulationConfig,
      );
      setDevices(cloneDevicesState(backendStateRef.current));

      appendLog(action, config.message, source);

      if (config.detection) {
        setDetectionStatus((prev) => ({
          gesture: config.detection?.gesture ?? prev.gesture,
          voice: VOICE_STATUS_PLACEHOLDER,
        }));
      }

      const result: ControlActionResult = {
        success: true,
        message: config.message,
        level: "info",
      };
      setLastActionResult(result);
      return result;
    },
    [appendLog, simulationConfig],
  );

  const handleManualAction = useCallback(
    (action: ControlAction) => {
      return performAction(action, "manual");
    },
    [performAction],
  );

  const handleGestureSignal = useCallback(
    (signal: GestureSignal) => {
      setDetectionStatus((prev) => ({ ...prev, gesture: signal }));

      const actions: ControlAction[] = [];
      if (signal === GestureSignal.DownwardWave) {
        if (backendStateRef.current.coffee.status === "needs-capsule") {
          actions.push("coffee_capsule_load");
        }
        actions.push("coffee_activate");
      } else {
        const mappedAction = GESTURE_TO_ACTION[signal];
        if (mappedAction) {
          actions.push(mappedAction);
        }
      }

      if (!actions.length) {
        return null;
      }

      let result: ControlActionResult | null = null;
      actions.forEach((action) => {
        result = performAction(action, "gesture");
      });
      setDetectionStatus((prev) => ({ ...prev, gesture: signal }));
      return result;
    },
    [performAction],
  );

  const handleStopAll = useCallback(() => {
    performAction("stop_all", "manual");
  }, [performAction]);

  const handleClearLog = useCallback(() => {
    setLogEntries([]);
  }, []);

  const handleExportLog = useCallback(() => {
    if (!logEntries.length || typeof window === "undefined") {
      return;
    }

    const header = "timestamp,action,message,source";
    const rows = logEntries.map((entry) => {
      const timestamp = new Date(entry.timestamp).toLocaleString();
      const escapedMessage = entry.message.replace(/"/g, '""');
      return [timestamp, entry.action, escapedMessage, entry.source]
        .map((cell) => `"${cell}"`)
        .join(",");
    });
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `smart-kitchen-log-${Date.now()}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [logEntries]);

  const updateOvenSettings = useCallback(
    (settings: SimulationConfig["oven"]) => {
      const normalized: SimulationConfig["oven"] = {
        targetTemperature: Math.round(
          Math.min(OVEN_MAX_TEMPERATURE, Math.max(OVEN_MIN_TEMPERATURE, settings.targetTemperature)),
        ),
        heatDuration: Math.round(
          Math.min(OVEN_MAX_HEAT_SECONDS, Math.max(OVEN_MIN_HEAT_SECONDS, settings.heatDuration)),
        ),
      };

      setSimulationConfig({ oven: { ...normalized } });

      const nextBackend = cloneDevicesState(backendStateRef.current);
      nextBackend.oven.targetTemperature = normalized.targetTemperature;
      if (nextBackend.oven.status !== "heating") {
        nextBackend.oven.timeRemaining = null;
        nextBackend.oven.timeTotal = null;
      }
      backendStateRef.current = nextBackend;
      setDevices(cloneDevicesState(nextBackend));
    },
    [setDevices, setSimulationConfig],
  );

  const resetOvenSettings = useCallback(() => {
    updateOvenSettings({ ...DEFAULT_SIMULATION_CONFIG.oven });
  }, [updateOvenSettings]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    let cancelled = false;

    const tick = () => {
      refreshDeviceStatus().catch(() => {
        /* mock polling ignores network errors */
      });
    };

    tick();
    const intervalId = window.setInterval(() => {
      if (!cancelled) {
        tick();
      }
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [refreshDeviceStatus]);

  const deviceSummaries = useMemo(() => createDeviceSummaries(devices), [devices]);
  const deviceCards = useMemo(() => createDeviceCards(devices), [devices]);
  const logSummaryItems = useMemo(() => buildLogSummaryItems(logEntries), [logEntries]);
  const timelineItems = useMemo(() => buildTimelineItems(logEntries), [logEntries]);
  const actionAvailability = useMemo(() => buildActionAvailability(devices), [devices]);

  return {
    deviceSummaries,
    deviceCards,
    detectionStatus,
    setDetectionStatus,
    logSummaryItems,
    timelineItems,
    logCount: logEntries.length,
    manualSections: MANUAL_SECTIONS,
    actionAvailability,
    performAction,
    handleManualAction,
  handleGestureSignal,
    handleStopAll,
    handleClearLog,
    handleExportLog,
    refreshDeviceStatus,
    latestSnapshot,
    lastActionResult,
    ovenSettings: simulationConfig.oven,
    updateOvenSettings,
    resetOvenSettings,
  };
};
