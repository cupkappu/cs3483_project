import "../styles/board-shared.css";
import "../styles/guide-board.css";
import LiveCameraFeed from "./LiveCameraFeed";
import type { DetectionStatus, GuideSubState } from "../types";

interface GuideBoardProps {
  guideState: GuideSubState;
  tutorialPage: number;
  onSelectTutorialPage: (page: number) => void;
  detectionStatus: DetectionStatus;
}

const tutorialPages = [1, 2, 3, 4];

export default function GuideBoard({
  guideState,
  tutorialPage,
  onSelectTutorialPage,
  detectionStatus,
}: GuideBoardProps) {
  if (guideState === "manual") {
    return <ManualBoard detectionStatus={detectionStatus} />;
  }

  return (
    <TutorialBoard
      page={tutorialPage}
      onSelectPage={onSelectTutorialPage}
      detectionStatus={detectionStatus}
    />
  );
}

function TutorialBoard({
  page,
  onSelectPage,
  detectionStatus,
}: {
  page: number;
  onSelectPage: (page: number) => void;
  detectionStatus: DetectionStatus;
}) {
  const gesturePositive = detectionStatus.gesture !== "NONE";
  const voicePositive = detectionStatus.voice !== "NONE";

  return (
    <div className="tutorial-layout">
      <header className="tutorial-top">
        <h1>Feature 1: Water Kettle</h1>
        <div className="tutorial-page-group">
          <span>PAGE :</span>
          {tutorialPages.map((num) => (
            <button
              key={num}
              type="button"
              className={
                num === page ? "tutorial-page active" : "tutorial-page"
              }
              onClick={() => onSelectPage(num)}
            >
              {num}
            </button>
          ))}
        </div>
      </header>

      <div className="tutorial-columns">
        <section className="tutorial-column">
          <h2>LIVE CAMERA</h2>
          <LiveCameraFeed
            frameClassName="camera-frame camera-frame--live"
            showStatus={false}
          />
          <div className="status-block">
            <span className="status-label">Gesture Detect:</span>
            <div className="status-line">
              <span className="status-icon" aria-hidden="true">
                📷
              </span>
              <span
                className={
                  gesturePositive ? "status-text status-success" : "status-text"
                }
              >
                {detectionStatus.gesture}
              </span>
            </div>
          </div>
        </section>

        <section className="tutorial-column">
          <h2>DEMO</h2>
          <div className="demo-frame">
            <div className="demo-placeholder" aria-hidden="true" />
          </div>
          <span className="demo-caption">Please Upward Wave</span>
          <div className="status-block">
            <span className="status-label">Voice Command Detect:</span>
            <div className="status-line">
              <span className="status-icon" aria-hidden="true">
                🎙️
              </span>
              <span
                className={
                  voicePositive ? "status-text status-success" : "status-text"
                }
              >
                {detectionStatus.voice}
              </span>
            </div>
          </div>
        </section>

        <section className="tutorial-column tutorial-column--instruction">
          <div className="instruction-group">
            <h3>
              Start Command <span className="instruction-note">(After Gesture)</span>:
            </h3>
            <p>Start (English)</p>
            <p>開始 (in Cantonese / Mandarin)</p>
          </div>
          <div className="instruction-group">
            <h3>
              Stop Command <span className="instruction-note">(Anytime)</span>:
            </h3>
            <p>Stop (English)</p>
            <p>停止 (in Cantonese / Mandarin)</p>
          </div>
        </section>
      </div>

      <footer className="tutorial-footer">
        <button type="button" className="step-button">
          NEXT -&gt;
        </button>
      </footer>
    </div>
  );
}

function ManualBoard({
  detectionStatus,
}: {
  detectionStatus: DetectionStatus;
}) {
  const gesturePositive = detectionStatus.gesture !== "NONE";
  const voicePositive = detectionStatus.voice !== "NONE";

  return (
    <div className="manual-layout">
      <section className="manual-left">
        <h1>Control</h1>
        <div className="manual-block">
          <h2>Hand Gesture</h2>
          <ul className="manual-list">
            <li>
              <span role="img" aria-hidden="true">
                🙌
              </span>
              Upward Wave: Boil Water
            </li>
            <li>
              <span role="img" aria-hidden="true">
                👋
              </span>
              Downward Wave: 1. Start Coffee Maker
            </li>
            <li>
              <span role="img" aria-hidden="true">
                ✊
              </span>
              Fist: Espresso &nbsp;&nbsp;
              <span role="img" aria-hidden="true">
                ✋
              </span>
              Palm: Lungo
            </li>
            <li>
              <span role="img" aria-hidden="true">
                🤜
              </span>
              Push: Start Oven
            </li>
            <li className="manual-alert">
              <span role="img" aria-hidden="true">
                🙏
              </span>
              Two-Handed Palm: Shut Down All
            </li>
          </ul>
        </div>

        <div className="manual-block">
          <h2>Bilingual Voice Command</h2>
          <p>
            <strong>Start Command:</strong>
          </p>
          <p>Start (English) / 開始 (in Cantonese / Mandarin)</p>
          <p>
            <strong>Stop Command:</strong>
          </p>
          <p>Stop (English) / 停止 (in Cantonese / Mandarin)</p>
        </div>
      </section>

      <section className="manual-right">
        <h2>LIVE CAMERA</h2>
        <LiveCameraFeed
          frameClassName="camera-frame camera-frame--live camera-frame--tall"
          showStatus={false}
        />
        <div className="status-block">
          <span className="status-label">Gesture Detect:</span>
          <div className="status-line">
            <span className="status-icon" aria-hidden="true">
              📷
            </span>
            <span
              className={
                gesturePositive ? "status-text status-success" : "status-text"
              }
            >
              {detectionStatus.gesture}
            </span>
          </div>
        </div>
        <div className="status-block">
          <span className="status-label">Voice Command Detect:</span>
          <div className="status-line">
            <span className="status-icon" aria-hidden="true">
              🎙️
            </span>
            <span
              className={
                voicePositive ? "status-text status-success" : "status-text"
              }
            >
              {detectionStatus.voice}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
