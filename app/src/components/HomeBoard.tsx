import "../styles/board-shared.css";
import "../styles/home-board.css";

import LiveCameraFeed from "./LiveCameraFeed";
import type {
  DetectionStatus,
  DeviceCardInfo,
  DeviceHeroSummary,
} from "../types";

interface HomeBoardProps {
  colorblindMode: boolean;
  meetingMode: boolean;
  detectionStatus: DetectionStatus;
  deviceSummaries: DeviceHeroSummary[];
  deviceCards: DeviceCardInfo[];
  onToggleColorblind: () => void;
  onToggleMeeting: () => void;
}

export default function HomeBoard({
  colorblindMode,
  meetingMode,
  detectionStatus,
  deviceSummaries,
  deviceCards,
  onToggleColorblind,
  onToggleMeeting,
}: HomeBoardProps) {
  return (
    <div className="home-board">
      <div className="home-sidebar">
        <section className="home-panel">

          <h2>Mode</h2>
          <button type="button" className="mode-toggle" onClick={onToggleColorblind}>
            <span
              className={
                colorblindMode ? "mode-indicator active" : "mode-indicator"
              }
            />
            Colorblind Mode
          </button>
          <button type="button" className="mode-toggle" onClick={onToggleMeeting}>
            <span
              className={
                meetingMode ? "mode-indicator active" : "mode-indicator"
              }
            />
            Meeting Mode
          </button>
        </section>

        <section className="home-panel">
          <h3>LIVE CAMERA</h3>
          <LiveCameraFeed
            canvasSize={{ width: 240, height: 180 }}
            wrapperClassName="home-camera-block"
            frameClassName="camera-feed camera-frame--live"
            showStatus={false}
          />
        </section>

        <section className="home-panel">
          <h3>Detection Status</h3>
          <div className="detection-status">
            <div className="detection-line">
              <span className="detection-label">Gesture</span>
              <span
                className={
                  detectionStatus.gesture === "NONE"
                    ? "gesture-status is-empty"
                    : "gesture-status"
                }
              >
                {detectionStatus.gesture}
              </span>
            </div>
            <div className="detection-line">
              <span className="detection-label">Voice</span>
              <span
                className={
                  detectionStatus.voice === "NONE"
                    ? "voice-status is-empty"
                    : "voice-status"
                }
              >
                {detectionStatus.voice}
              </span>
            </div>
          </div>
        </section>
      </div>

      <div className="home-main">
        <div className="home-devices">
          {deviceSummaries.map((device) => (
            <div key={device.id} className={`device-hero ${device.variant}`}>
              <span className="device-hero__status" aria-hidden="true">
                {device.statusIcon}
              </span>
              <div className="device-hero__icon">
                {device.media.kind === "video" ? (
                  <video
                    src={device.media.src}
                    poster={device.media.poster}
                    autoPlay={device.media.autoPlay ?? true}
                    loop={device.media.loop ?? true}
                    muted={device.media.muted ?? true}
                    playsInline
                    role="img"
                    aria-label={device.media.alt}
                  />
                ) : (
                  <img src={device.media.src} alt={device.media.alt} loading="lazy" />
                )}
              </div>
              <div className="device-hero__label">{device.label}</div>
              <div className="device-hero__status-label">{device.statusLabel}</div>
            </div>
          ))}
        </div>

        <div className="home-device-grid">
          {deviceCards.map((card) => (
            <article key={card.id} className={`device-card ${card.variant}`}>
              <h3>{card.state}</h3>
              <div className="device-card__detail">{card.detail}</div>
              {card.progress !== undefined && (
                <div
                  className="device-card__progress"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(card.progress * 100)}
                >
                  <span
                    className="device-card__progress-fill"
                    style={{ width: `${Math.round(card.progress * 100)}%` }}
                  />
                </div>
              )}
              <div className="device-card__foot">
                {card.footerLabel || "\u00a0"}
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
