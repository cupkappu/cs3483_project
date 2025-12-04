import type {
  ControlAction,
  DetectionStatus,
  DeviceCardInfo,
  DeviceHeroSummary,
  ManualControlSection,
} from "../types";

interface HomeBoardProps {
  colorblindMode: boolean;
  meetingMode: boolean;
  detectionStatus: DetectionStatus;
  deviceSummaries: DeviceHeroSummary[];
  deviceCards: DeviceCardInfo[];
  manualSections: ManualControlSection[];
  onToggleColorblind: () => void;
  onToggleMeeting: () => void;
  onManualAction: (action: ControlAction) => void;
}

export default function HomeBoard({
  colorblindMode,
  meetingMode,
  detectionStatus,
  deviceSummaries,
  deviceCards,
  manualSections,
  onToggleColorblind,
  onToggleMeeting,
  onManualAction,
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
          <div className="camera-feed">"Camera Area"</div>
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

        {manualSections.length > 0 && (
          <section className="home-panel">
            <h3>Manual Controls</h3>
            <div className="manual-controls">
              {manualSections.map((section) => (
                <div key={section.id} className="manual-section">
                  <h4>{section.title}</h4>
                  <div className="manual-actions">
                    {section.actions.map((action) => {
                      const toneClass =
                        action.tone && action.tone !== "default"
                          ? ` manual-button--${action.tone}`
                          : "";
                      return (
                        <button
                          key={action.id}
                          type="button"
                          className={`manual-button${toneClass}`}
                          onClick={() => onManualAction(action.id)}
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
        )}
      </div>

      <div className="home-main">
        <div className="home-devices">
          {deviceSummaries.map((device) => (
            <div key={device.id} className={`device-hero ${device.variant}`}>
              <span className="device-hero__status" aria-hidden="true">
                {device.statusIcon}
              </span>
              <div className="device-hero__icon">
                <img src={device.iconSrc} alt={device.iconAlt} loading="lazy" />
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
