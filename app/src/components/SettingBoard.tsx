import "../styles/board-shared.css";
import "../styles/setting-board.css";

interface SettingBoardProps {
  colorblindMode: boolean;
  meetingMode: boolean;
  onToggleColorblind: () => void;
  onToggleMeeting: () => void;
}

export default function SettingBoard({
  colorblindMode,
  meetingMode,
  onToggleColorblind,
  onToggleMeeting,
}: SettingBoardProps) {
  return (
    <div className="setting-layout">
      <div className="setting-top">
        <div className="setting-modes">
          <button type="button" className="mode-toggle" onClick={onToggleColorblind}>
            <span
              className={colorblindMode ? "mode-indicator active" : "mode-indicator"}
              aria-hidden="true"
            />
            Colorblind Mode
          </button>
          <button type="button" className="mode-toggle" onClick={onToggleMeeting}>
            <span
              className={meetingMode ? "mode-indicator active" : "mode-indicator"}
              aria-hidden="true"
            />
            Meeting Mode
          </button>
        </div>
        <div className="setting-camera">
          <h2>LIVE CAMERA</h2>
          <div className="camera-frame">"Camera Area"</div>
        </div>
      </div>

      <div className="setting-columns">
        <section className="setting-column">
          <h2>Device Connected :</h2>
          <p>Water Kettle : WK-001</p>
          <p>Oven : panasonic-E200</p>
          <p>Coffee Maker : Essenza Mini (RED)</p>
        </section>

        <section className="setting-column">
          <h2>Oven Setting :</h2>
          <div className="setting-input-row">
            <label>Temperature :</label>
            <div className="setting-spinner">120</div>
          </div>
          <div className="setting-input-row">
            <label>Time :</label>
            <div className="setting-spinner">120</div>
          </div>
        </section>
      </div>

      <div className="setting-sliders">
        <div className="setting-slider">
          <div className="slider-icon" aria-hidden="true">
            🎙️
          </div>
          <div className="slider-label">Mic Detected</div>
          <div className="slider-bar">
            <span className="slider-fill slider-fill--high" />
          </div>
        </div>
        <div className="setting-slider">
          <div className="slider-icon" aria-hidden="true">
            🔊
          </div>
          <div className="slider-label">Sound Volume</div>
          <div className="slider-bar">
            <span className="slider-fill" />
          </div>
        </div>
        <button type="button" className="reset-button">
          Reset
        </button>
      </div>
    </div>
  );
}
