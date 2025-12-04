import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  ControlAction,
  ControlSource,
  DetectionStatus,
  DevicePollingSnapshot,
  DeviceStatusDto,
  DevicesState,
  LogEntry,
} from "../types";
import {
  ACTION_CONFIG,
  INITIAL_DEVICES,
  MANUAL_SECTIONS,
  MAX_LOG_ENTRIES,
} from "../config/controlConfig";
import { createDeviceCards, createDeviceSummaries } from "../utils/deviceViewModel";
import { buildLogSummaryItems, buildTimelineItems } from "../utils/logging";

const POLL_INTERVAL_MS = 1000;
const AMBIENT_TEMPERATURE = 26;
const KETTLE_TARGET_TEMPERATURE = 100;
const KETTLE_BOIL_SECONDS = 90;
const KETTLE_HEAT_RATE = 4;
const KETTLE_COOL_RATE = 2;

const ESPRESSO_SECONDS = 25;
const LUNGO_SECONDS = 35;

const OVEN_PREHEAT_TARGET = 180;
const OVEN_HEAT_SECONDS = 150;
const OVEN_PREHEAT_RATE = 10;
const OVEN_COOL_RATE = 3;

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

const applyActionToDevices = (state: DevicesState, action: ControlAction): DevicesState => {
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
      next.kettle.timeTotal = next.kettle.timeTotal ?? KETTLE_BOIL_SECONDS;
      next.kettle.timeRemaining = 0;
      next.kettle.temperature = Math.max(next.kettle.temperature, next.kettle.targetTemperature);
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
      next.kettle.status = "idle";
      next.kettle.timeRemaining = null;
      next.kettle.timeTotal = null;
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
      next.oven.targetTemperature = OVEN_PREHEAT_TARGET;
      next.oven.timeRemaining = null;
      next.oven.timeTotal = null;
      break;
    }
    case "oven_start_heat": {
      next.oven.status = "heating";
      next.oven.targetTemperature = OVEN_PREHEAT_TARGET;
      next.oven.timeTotal = OVEN_HEAT_SECONDS;
      next.oven.timeRemaining = OVEN_HEAT_SECONDS;
      if (next.oven.temperature < OVEN_PREHEAT_TARGET) {
        next.oven.temperature = Math.max(next.oven.temperature, OVEN_PREHEAT_TARGET - 10);
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

const advanceDevices = (state: DevicesState): DevicesState => {
  const next = cloneDevicesState(state);

  if (next.kettle.status === "boiling") {
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
    if (next.kettle.temperature > AMBIENT_TEMPERATURE + 5) {
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
    next.oven.timeTotal = next.oven.timeTotal ?? OVEN_HEAT_SECONDS;
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
    updatedAt: timestamp,
  },
  {
    id: "coffee",
    status: state.coffee.status,
    remainingSeconds: state.coffee.timeRemaining,
    totalSeconds: state.coffee.timeTotal,
    selectedSize: state.coffee.selectedSize,
    lastSize: state.coffee.lastSize,
    updatedAt: timestamp,
  },
  {
    id: "oven",
    status: state.oven.status,
    remainingSeconds: state.oven.timeRemaining,
    totalSeconds: state.oven.timeTotal,
    temperature: state.oven.temperature,
    targetTemperature: state.oven.targetTemperature,
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
  performAction: (action: ControlAction, source?: ControlSource) => void;
  handleManualAction: (action: ControlAction) => void;
  handleStopAll: () => void;
  handleClearLog: () => void;
  handleExportLog: () => void;
  refreshDeviceStatus: () => Promise<DevicePollingSnapshot>;
  latestSnapshot: DevicePollingSnapshot | null;
}

export const useControlManager = (): ControlManagerApi => {
  const [devices, setDevices] = useState<DevicesState>(() => cloneDevicesState(INITIAL_DEVICES));
  const backendStateRef = useRef<DevicesState>(cloneDevicesState(INITIAL_DEVICES));
  const [detectionStatus, setDetectionStatus] = useState<DetectionStatus>({
    gesture: "NONE",
    voice: "NONE",
  });
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [latestSnapshot, setLatestSnapshot] = useState<DevicePollingSnapshot | null>(null);

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
    backendStateRef.current = advanceDevices(backendStateRef.current);
    const snapshot = createSnapshot(backendStateRef.current);
    setLatestSnapshot(snapshot);
    setDevices(cloneDevicesState(backendStateRef.current));
    return snapshot;
  }, []);

  const performAction = useCallback(
    (action: ControlAction, source: ControlSource = "manual") => {
      const config = ACTION_CONFIG[action];
      if (!config) {
        return;
      }

      backendStateRef.current = applyActionToDevices(backendStateRef.current, action);
      setDevices(cloneDevicesState(backendStateRef.current));

      appendLog(action, config.message, source);

      if (config.detection) {
        setDetectionStatus((prev) => ({
          gesture: config.detection?.gesture ?? prev.gesture,
          voice: config.detection?.voice ?? prev.voice,
        }));
      }
    },
    [appendLog],
  );

  const handleManualAction = useCallback(
    (action: ControlAction) => {
      performAction(action, "manual");
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

  return {
    deviceSummaries,
    deviceCards,
    detectionStatus,
    setDetectionStatus,
    logSummaryItems,
    timelineItems,
    logCount: logEntries.length,
    manualSections: MANUAL_SECTIONS,
    performAction,
    handleManualAction,
    handleStopAll,
    handleClearLog,
    handleExportLog,
    refreshDeviceStatus,
    latestSnapshot,
  };
};
