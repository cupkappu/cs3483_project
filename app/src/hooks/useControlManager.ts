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

const createLogId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
};

const POLL_INTERVAL_MS = 1000;
const KETTLE_CYCLE_SECONDS = 64;
const OVEN_CYCLE_SECONDS = 64;
const ESPRESSO_SECONDS = 25;
const LUNGO_SECONDS = 35;

const cloneDevicesState = (state: DevicesState): DevicesState => ({
  kettle: { ...state.kettle },
  coffee: { ...state.coffee },
  oven: { ...state.oven },
});

const decrementTimer = (value: number | null, amount: number) => {
  if (value == null) {
    return value;
  }
  return Math.max(0, value - amount);
};

const applyActionToDevices = (state: DevicesState, action: ControlAction): DevicesState => {
  const next = cloneDevicesState(state);

  switch (action) {
    case "kettle_start":
      next.kettle.status = "boiling";
      next.kettle.timeTotal = KETTLE_CYCLE_SECONDS;
      next.kettle.timeRemaining = KETTLE_CYCLE_SECONDS;
      next.kettle.temperature = Math.min(next.kettle.temperature, next.kettle.targetTemperature);
      break;
    case "kettle_ready":
      next.kettle.status = "ready";
      next.kettle.timeTotal = next.kettle.timeTotal ?? KETTLE_CYCLE_SECONDS;
      next.kettle.timeRemaining = 0;
      next.kettle.temperature = next.kettle.targetTemperature;
      break;
    case "kettle_stop":
      next.kettle.status = "idle";
      next.kettle.timeRemaining = null;
      next.kettle.timeTotal = next.kettle.timeTotal ?? KETTLE_CYCLE_SECONDS;
      break;
    case "kettle_empty":
      next.kettle.status = "water-empty";
      next.kettle.timeRemaining = null;
      break;
    case "kettle_refill":
      next.kettle.status = "idle";
      next.kettle.timeRemaining = null;
      break;
    case "coffee_brew_espresso":
      next.coffee.status = "brewing";
      next.coffee.lastSize = "espresso";
      next.coffee.timeTotal = ESPRESSO_SECONDS;
      next.coffee.timeRemaining = ESPRESSO_SECONDS;
      break;
    case "coffee_ready_espresso":
      next.coffee.status = "espresso-ready";
      next.coffee.lastSize = "espresso";
      next.coffee.timeTotal = next.coffee.timeTotal ?? ESPRESSO_SECONDS;
      next.coffee.timeRemaining = 0;
      break;
    case "coffee_brew_lungo":
      next.coffee.status = "brewing";
      next.coffee.lastSize = "lungo";
      next.coffee.timeTotal = LUNGO_SECONDS;
      next.coffee.timeRemaining = LUNGO_SECONDS;
      break;
    case "coffee_ready_lungo":
      next.coffee.status = "lungo-ready";
      next.coffee.lastSize = "lungo";
      next.coffee.timeTotal = next.coffee.timeTotal ?? LUNGO_SECONDS;
      next.coffee.timeRemaining = 0;
      break;
    case "coffee_capsule_empty":
      next.coffee.status = "needs-capsule";
      next.coffee.timeRemaining = null;
      next.coffee.timeTotal = null;
      break;
    case "coffee_capsule_load":
      next.coffee.status = "idle";
      next.coffee.timeRemaining = null;
      next.coffee.timeTotal = null;
      break;
    case "coffee_reset":
      next.coffee.status = "idle";
      next.coffee.lastSize = null;
      next.coffee.timeRemaining = null;
      next.coffee.timeTotal = null;
      break;
    case "oven_start":
      next.oven.status = "heating";
      next.oven.timeTotal = OVEN_CYCLE_SECONDS;
      next.oven.timeRemaining = OVEN_CYCLE_SECONDS;
      break;
    case "oven_ready":
      next.oven.status = "ready";
      next.oven.timeTotal = next.oven.timeTotal ?? OVEN_CYCLE_SECONDS;
      next.oven.timeRemaining = 0;
      break;
    case "oven_stop":
      next.oven.status = "idle";
      next.oven.timeRemaining = null;
      next.oven.timeTotal = next.oven.timeTotal ?? OVEN_CYCLE_SECONDS;
      break;
    case "stop_all":
      next.kettle = {
        ...next.kettle,
        status: "idle",
        timeRemaining: null,
      };
      next.coffee = {
        ...next.coffee,
        status: "idle",
        timeRemaining: null,
        timeTotal: null,
      };
      next.oven = {
        ...next.oven,
        status: "idle",
        timeRemaining: null,
      };
      break;
    default:
      break;
  }

  return next;
};

const advanceDevices = (state: DevicesState): DevicesState => {
  const next = cloneDevicesState(state);

  if (next.kettle.status === "boiling") {
    const remaining = decrementTimer(next.kettle.timeRemaining, 1);
    next.kettle.timeRemaining = remaining;
    if (remaining === 0) {
      next.kettle.status = "ready";
      next.kettle.temperature = next.kettle.targetTemperature;
    } else if (typeof remaining === "number" && next.kettle.temperature < next.kettle.targetTemperature) {
      next.kettle.temperature = Math.min(next.kettle.targetTemperature, next.kettle.temperature + 1);
    }
  }

  if (next.coffee.status === "brewing") {
    const remaining = decrementTimer(next.coffee.timeRemaining, 1);
    next.coffee.timeRemaining = remaining;
    if (remaining === 0) {
      next.coffee.status = next.coffee.lastSize === "lungo" ? "lungo-ready" : "espresso-ready";
    }
  }

  if (next.oven.status === "heating") {
    const remaining = decrementTimer(next.oven.timeRemaining, 1);
    next.oven.timeRemaining = remaining;
    if (remaining === 0) {
      next.oven.status = "ready";
    } else if (typeof remaining === "number") {
      next.oven.temperature = Math.min(240, next.oven.temperature + 2);
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
    lastSize: state.coffee.lastSize,
    updatedAt: timestamp,
  },
  {
    id: "oven",
    status: state.oven.status,
    remainingSeconds: state.oven.timeRemaining,
    totalSeconds: state.oven.timeTotal,
    temperature: state.oven.temperature,
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
