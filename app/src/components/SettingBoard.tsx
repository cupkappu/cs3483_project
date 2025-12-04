import type { ChangeEvent } from "react";
import type { GestureSignal } from "../types";
import "../styles/board-shared.css";
import "../styles/setting-board.css";
import LiveCameraFeed from "./LiveCameraFeed";

interface SettingBoardProps {
  colorblindMode: boolean;
  meetingMode: boolean;
  onToggleColorblind: () => void;
  onToggleMeeting: () => void;
  ovenSettings: {
    targetTemperature: number;
    heatDuration: number;
  };
  onUpdateOvenSettings: (settings: { targetTemperature: number; heatDuration: number }) => void;
  onResetOvenSettings: () => void;
  onGestureDetected?: (signal: GestureSignal) => void;
}

export default function SettingBoard({
  colorblindMode,
  meetingMode,
  onToggleColorblind,
  onToggleMeeting,
  ovenSettings,
  onUpdateOvenSettings,
  onResetOvenSettings,
  onGestureDetected,
}: SettingBoardProps) {
  const handleTemperatureChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = Number.parseInt(event.target.value, 10);
    if (Number.isFinite(nextValue)) {
      onUpdateOvenSettings({
        targetTemperature: Math.max(80, Math.min(260, nextValue)),
        heatDuration: ovenSettings.heatDuration,
      });
    }
  };

  const handleDurationChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = Number.parseInt(event.target.value, 10);
    if (Number.isFinite(nextValue)) {
      onUpdateOvenSettings({
        targetTemperature: ovenSettings.targetTemperature,
        heatDuration: Math.max(30, Math.min(600, nextValue)),
      });
    }
  };

  return (
    <div className="setting-layout">
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
        <LiveCameraFeed
          canvasSize={{ width: 320, height: 240 }}
          frameClassName="camera-frame camera-frame--live"
          showStatus={false}
          onGestureChange={onGestureDetected}
        />
      </div>

      <section className="setting-column">
        <h2>Device Connected :</h2>
        <p>Water Kettle : WK-001</p>
        <p>Oven : panasonic-E200</p>
        <p>Coffee Maker : Essenza Mini (RED)</p>
      </section>

      <section className="setting-column">
        <h2>Oven Setting :</h2>
        <label className="setting-input-row">
          <span>Temperature :</span>
          <input
            type="number"
            className="setting-spinner"
            value={ovenSettings.targetTemperature}
            min={80}
            max={260}
            step={5}
            onChange={handleTemperatureChange}
          />
        </label>
        <label className="setting-input-row">
          <span>Time (s) :</span>
          <input
            type="number"
            className="setting-spinner"
            value={ovenSettings.heatDuration}
            min={30}
            max={600}
            step={10}
            onChange={handleDurationChange}
          />
        </label>
      </section>

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
      <button type="button" className="reset-button" onClick={onResetOvenSettings}>
        Reset
      </button>
    </div>
  );
}
