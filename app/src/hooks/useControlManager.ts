import { useCallback, useMemo, useState } from "react";
import type {
  ControlAction,
  ControlSource,
  DetectionStatus,
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
}

export const useControlManager = (): ControlManagerApi => {
  const [devices, setDevices] = useState<DevicesState>(INITIAL_DEVICES);
  const [detectionStatus, setDetectionStatus] = useState<DetectionStatus>({
    gesture: "NONE",
    voice: "NONE",
  });
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);

  const appendLog = useCallback((action: ControlAction, message: string, source: ControlSource) => {
    setLogEntries((prev) => {
      const entry: LogEntry = {
        id: createLogId(),
        timestamp: new Date().toISOString(),
        action,
        message,
        source,
      };
      const next = [...prev, entry];
      return next.slice(-MAX_LOG_ENTRIES);
    });
  }, []);

  // Gesture / voice integrations can call this helper with any source flag to unify device state updates.
  const performAction = useCallback(
    (action: ControlAction, source: ControlSource = "manual") => {
      const config = ACTION_CONFIG[action];
      if (!config) {
        return;
      }

      setDevices((prev) => {
        const next: DevicesState = {
          kettle: { ...prev.kettle },
          coffee: { ...prev.coffee },
          oven: { ...prev.oven },
        };

        switch (action) {
          case "kettle_start":
            next.kettle.status = "boiling";
            next.kettle.timeRemaining = 64;
            next.kettle.temperature = next.kettle.targetTemperature;
            break;
          case "kettle_ready":
            next.kettle.status = "ready";
            next.kettle.timeRemaining = 0;
            break;
          case "kettle_stop":
            next.kettle.status = "idle";
            next.kettle.timeRemaining = null;
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
            break;
          case "coffee_ready_espresso":
            next.coffee.status = "espresso-ready";
            next.coffee.lastSize = "espresso";
            break;
          case "coffee_brew_lungo":
            next.coffee.status = "brewing";
            next.coffee.lastSize = "lungo";
            break;
          case "coffee_ready_lungo":
            next.coffee.status = "lungo-ready";
            next.coffee.lastSize = "lungo";
            break;
          case "coffee_capsule_empty":
            next.coffee.status = "needs-capsule";
            break;
          case "coffee_capsule_load":
            next.coffee.status = "idle";
            break;
          case "coffee_reset":
            next.coffee.status = "idle";
            next.coffee.lastSize = null;
            break;
          case "oven_start":
            next.oven.status = "heating";
            next.oven.timeRemaining = 64;
            break;
          case "oven_ready":
            next.oven.status = "ready";
            next.oven.timeRemaining = 0;
            break;
          case "oven_stop":
            next.oven.status = "idle";
            next.oven.timeRemaining = null;
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
            };
            next.oven = {
              ...next.oven,
              status: "idle",
              timeRemaining: null,
            };
            break;
          default:
            return prev;
        }

        return next;
      });

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
  };
};
