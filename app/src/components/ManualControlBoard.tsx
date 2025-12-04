import { useState } from "react";
import type {
  ActionAvailabilityMap,
  ControlAction,
  DetectionStatus,
  DevicePollingSnapshot,
  DeviceStatusDto,
  LogTimelineItem,
  ManualControlSection,
  ControlActionResult,
} from "../types";

interface ManualControlBoardProps {
  sections: ManualControlSection[];
  detectionStatus: DetectionStatus;
  latestSnapshot: DevicePollingSnapshot | null;
  onAction: (action: ControlAction) => ControlActionResult;
  actionAvailability: ActionAvailabilityMap;
  onRefresh: () => Promise<DevicePollingSnapshot>;
  timelineItems: LogTimelineItem[];
  lastActionResult: ControlActionResult | null;
}

const formatFetchedAt = (snapshot: DevicePollingSnapshot | null) => {
  if (!snapshot?.fetchedAt) {
    return "Never";
  }

  const date = new Date(snapshot.fetchedAt);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const formatRemaining = (remaining?: number | null, total?: number | null) => {
  if (typeof remaining !== "number") {
    return "—";
  }

  if (typeof total === "number") {
    return `${remaining}s / ${total}s`;
  }

  return `${remaining}s`;
};

const formatSize = (size: string | null | undefined) => {
  if (!size) {
    return "--";
  }
  return size.charAt(0).toUpperCase() + size.slice(1);
};

const describeDetails = (device: DeviceStatusDto) => {
  switch (device.id) {
    case "kettle": {
      const current =
        typeof device.temperature === "number" ? `${device.temperature}°C` : "--";
      const target =
        typeof device.targetTemperature === "number" ? `${device.targetTemperature}°C` : "--";
      return `Temp ${current} → ${target}`;
    }
    case "coffee": {
      const drink = formatSize(device.selectedSize ?? device.lastSize);
      return `Selected: ${drink}`;
    }
    case "oven": {
      const current =
        typeof device.temperature === "number" ? `${device.temperature}°C` : "--";
      const target =
        typeof device.targetTemperature === "number" ? `${device.targetTemperature}°C` : "--";
      return `Temp ${current} → ${target}`;
    }
    default:
      return "";
  }
};

export default function ManualControlBoard({
  sections,
  detectionStatus,
  latestSnapshot,
  onAction,
  actionAvailability,
  onRefresh,
  timelineItems,
  lastActionResult,
}: ManualControlBoardProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      await onRefresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to refresh";
      setError(message);
    } finally {
      setIsRefreshing(false);
    }
  };

  const gesturePositive = detectionStatus.gesture !== "NONE";
  const voicePositive = detectionStatus.voice !== "NONE";

  return (
    <div className="manual-control-board">
      <header className="manual-control-header">
        <h1>Manual Signal Testing</h1>
        <p>
          Trigger device actions directly and inspect the simulated polling snapshot. This view is
          intended for development verification.
        </p>
      </header>

      <div className="manual-control-grid">
        <section className="manual-control-panel">
          <div className="manual-control-panel-head">
            <h2>Manual Triggers</h2>
            <p>Each button invokes the corresponding manual action against the mock backend.</p>
          </div>
          <div className="manual-controls">
            {sections.length === 0 && <div className="manual-control-empty">No manual actions configured.</div>}
            {sections.map((section) => (
              <div key={section.id} className="manual-section">
                <h3>{section.title}</h3>
                <div className="manual-actions">
                  {section.actions.map((action) => {
                    const toneClass =
                      action.tone && action.tone !== "default"
                        ? ` manual-button--${action.tone}`
                        : "";
                    const availability = actionAvailability[action.id];
                    const disabled = availability ? !availability.available : false;
                    return (
                      <button
                        key={action.id}
                        type="button"
                        className={`manual-button${toneClass}`}
                        onClick={() => onAction(action.id)}
                        disabled={disabled}
                        title={disabled ? availability?.reason : undefined}
                      >
                        {action.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="manual-control-status">
          <div className="manual-control-status-header">
            <h2>Latest Snapshot</h2>
            <button
              type="button"
              className="manual-control-refresh"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              {isRefreshing ? "Refreshing..." : "Refresh now"}
            </button>
          </div>
          <div className="manual-control-meta">Last fetched: {formatFetchedAt(latestSnapshot)}</div>
          {lastActionResult && (
            <div
              className={
                lastActionResult.success
                  ? "manual-control-feedback manual-control-feedback--success"
                  : "manual-control-feedback manual-control-feedback--warning"
              }
            >
              {lastActionResult.message}
            </div>
          )}
          {error && <div className="manual-control-error">{error}</div>}

          <div className="manual-control-table">
            {latestSnapshot ? (
              <table>
                <thead>
                  <tr>
                    <th scope="col">Device</th>
                    <th scope="col">Status</th>
                    <th scope="col">Remaining</th>
                    <th scope="col">Details</th>
                    <th scope="col">Constraint</th>
                  </tr>
                </thead>
                <tbody>
                  {latestSnapshot.devices.map((device) => (
                    <tr key={device.id}>
                      <th scope="row">{device.id}</th>
                      <td>{device.status}</td>
                      <td>{formatRemaining(device.remainingSeconds, device.totalSeconds)}</td>
                      <td>{describeDetails(device)}</td>
                      <td>{device.constraint ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="manual-control-empty">Polling snapshot not available yet.</div>
            )}
          </div>

          <div className="manual-control-detection">
            <h3>Detection Echo</h3>
            <div className="manual-control-detection-row">
              <span className="manual-control-detection-label">Gesture</span>
              <span
                className={
                  gesturePositive
                    ? "manual-control-detection-value manual-control-detection-value--active"
                    : "manual-control-detection-value"
                }
              >
                {detectionStatus.gesture}
              </span>
            </div>
            <div className="manual-control-detection-row">
              <span className="manual-control-detection-label">Voice</span>
              <span
                className={
                  voicePositive
                    ? "manual-control-detection-value manual-control-detection-value--active"
                    : "manual-control-detection-value"
                }
              >
                {detectionStatus.voice}
              </span>
            </div>
          </div>

          <div className="manual-control-timeline">
            <h3>Recent Actions</h3>
            {timelineItems.length > 0 ? (
              <ul className="manual-control-timeline-list">
                {timelineItems.map((item) => (
                  <li
                    key={item.id}
                    className={
                      item.variant === "alert"
                        ? "manual-control-timeline-item manual-control-timeline-item--alert"
                        : "manual-control-timeline-item"
                    }
                  >
                    <span className="manual-control-timeline-time">{item.time}</span>
                    <span className="manual-control-timeline-text">{item.text}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="manual-control-empty">No manual events logged yet.</div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
