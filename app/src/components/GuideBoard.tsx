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

interface TutorialContent {
  title: string;
  demoLabel: string;
  instructions: { heading: string; items: string[] }[];
  gestureNote?: string;
  voiceNote?: string;
}

const tutorialContent: Record<number, TutorialContent> = {
  1: {
    title: "Feature 1: Water Kettle",
    demoLabel: "Please Upward Wave",
    instructions: [
      {
        heading: "Start Command",
        items: ["Start (English)", "開始 (in Cantonese / Mandarin)"],
      },
      {
        heading: "Stop Command",
        items: ["Stop (English)", "停止 (in Cantonese / Mandarin)"],
      },
    ],
    gestureNote: "Gesture Detect:",
    voiceNote: "Voice Command Detect:",
  },
  2: {
    title: "Feature 2: Coffee Maker",
    demoLabel: "Palm Up for Lungo, Fist for Espresso",
    instructions: [
      {
        heading: "Select Size Gesture:",
        items: ["✊ Fist: Espresso", "✋ Palm: Lungo"],
      },
      {
        heading: "Voice Support:",
        items: ["Start (English) / 開始", "Stop (English) / 停止"],
      },
    ],
    gestureNote: "Gesture Detect:",
    voiceNote: "Voice Command Detect:",
  },
  3: {
    title: "Feature 3: Smart Oven",
    demoLabel: "Push Gesture to Begin Heating",
    instructions: [
      {
        heading: "Heating Sequence:",
        items: ["Push forward to start", "Raise palm to stop"],
      },
      {
        heading: "Temperature Tips:",
        items: ["Preheat completes at set target", "Monitor timer on status board"],
      },
    ],
    gestureNote: "Gesture Detect:",
    voiceNote: "Voice Command Detect:",
  },
  4: {
    title: "Feature 4: Emergency Stop",
    demoLabel: "Press Stop All Anytime",
    instructions: [
      {
        heading: "Global Stop Gesture:",
        items: ["🙏 Two-hand palm: Stop All"],
      },
      {
        heading: "Voice Command",
        items: ["Stop (English)", "停止 (in Cantonese / Mandarin)"],
      },
    ],
    gestureNote: "Gesture Detect:",
    voiceNote: "Voice Command Detect:",
  },
};

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
  const content = tutorialContent[page] ?? tutorialContent[1];
  const gesturePositive = detectionStatus.gesture !== "NONE";
  const voicePositive = detectionStatus.voice !== "NONE";

  return (
    <div className="tutorial-layout">
      <header className="tutorial-top">
  <h1>{content.title}</h1>
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
          <LiveCameraFeed frameClassName="camera-frame camera-frame--live" showStatus={false} />
          <div className="status-block">
            <span className="status-label">{content.gestureNote ?? "Gesture Detect:"}</span>
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
          <span className="demo-caption">{content.demoLabel}</span>
          <div className="status-block">
            <span className="status-label">{content.voiceNote ?? "Voice Command Detect:"}</span>
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
          {content.instructions.map((group) => (
            <div key={group.heading} className="instruction-group">
              <h3>
                {group.heading}
                {group.heading.includes("Start Command") && (
                  <span className="instruction-note"> (After Gesture)</span>
                )}
                {group.heading.includes("Stop Command") && (
                  <span className="instruction-note"> (Anytime)</span>
                )}
              </h3>
              {group.items.map((item) => (
                <p key={item}>{item}</p>
              ))}
            </div>
          ))}
        </section>
      </div>

      <footer className="tutorial-footer">
        <button type="button" className="step-button" onClick={() => onSelectPage(nextTutorialPage(page))}>
          NEXT -&gt;
        </button>
      </footer>
    </div>
  );
}

const nextTutorialPage = (current: number): number => {
  const currentIndex = tutorialPages.indexOf(current);
  if (currentIndex === -1) {
    return tutorialPages[0];
  }
  const nextIndex = (currentIndex + 1) % tutorialPages.length;
  return tutorialPages[nextIndex];
};

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
