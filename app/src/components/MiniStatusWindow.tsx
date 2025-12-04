import "../styles/mini-status-window.css";
import type { DeviceHeroSummary, DeviceId } from "../types";

interface MiniStatusWindowProps {
  meetingMode: boolean;
  deviceSummaries: DeviceHeroSummary[];
  onSelectDevice?: (deviceId: DeviceId) => void;
}

export default function MiniStatusWindow({
  meetingMode,
  deviceSummaries,
  onSelectDevice,
}: MiniStatusWindowProps) {
  return (
    <div className="mini-status-window">
      <header className="mini-status-window__header">
        <span className="mini-status-window__heading">Mode</span>
        <span
          className={
            meetingMode
              ? "mini-status-window__mode mini-status-window__mode--meeting"
              : "mini-status-window__mode"
          }
        >
          {meetingMode ? "Meeting" : "Standard"}
        </span>
      </header>

      <div className="mini-status-window__icons" role="list">
        {deviceSummaries.map((device) => (
          <button
            key={device.id}
            type="button"
            className="mini-status-icon"
            onClick={() => onSelectDevice?.(device.id)}
            role="listitem"
            aria-label={`${device.label} ${device.statusLabel}`}
            title={`${device.label} · ${device.statusLabel}`}
          >
            <span className="mini-status-icon__badge" aria-hidden="true">
              {device.statusIcon}
            </span>
            <div className="mini-status-icon__media" aria-hidden="true">
              {device.media.kind === "video" ? (
                <video
                  src={device.media.src}
                  poster={device.media.poster}
                  autoPlay={device.media.autoPlay ?? true}
                  loop={device.media.loop ?? true}
                  muted={device.media.muted ?? true}
                  playsInline
                />
              ) : (
                <img src={device.media.src} alt="" loading="lazy" />
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
