import { useEffect, useState } from "react";
import "../styles/board-shared.css";
import "../styles/guide-board.css";
import LiveCameraFeed from "./LiveCameraFeed";
import demoWaveUp from "../assets/waveup.mp4";
import demoWaveDown from "../assets/wavedown.mp4";
import demoFist from "../assets/fist.mp4";
import demoPalm from "../assets/plam.mp4";
import demoPush from "../assets/push.mp4";
import demoTwoHand from "../assets/TwoHandPalm.mp4";
import type { DetectionStatus, GestureSignal, GuideSubState } from "../types";

interface GuideBoardProps {
  guideState: GuideSubState;
  tutorialPage: number;
  onSelectTutorialPage: (page: number) => void;
  detectionStatus: DetectionStatus;
  onGestureDetected?: (signal: GestureSignal) => void;
}

const tutorialPages = [1, 2, 3, 4];

const nextTutorialPage = (current: number): number => {
  const currentIndex = tutorialPages.indexOf(current);
  if (currentIndex === -1) {
    return tutorialPages[0];
  }
  const nextIndex = (currentIndex + 1) % tutorialPages.length;
  return tutorialPages[nextIndex];
};

interface DemoClip {
  label: string;
  src: string;
}

interface TutorialStep {
  id: string;
  demoLabel: string;
  instructions: { heading: string; items: string[] }[];
  demoClips: DemoClip[];
  gestureNote?: string;
  voiceNote?: string;
}

interface TutorialContent {
  title: string;
  steps: TutorialStep[];
}

const tutorialContent: Record<number, TutorialContent> = {
  1: {
    title: "Feature 1: Water Kettle",
    steps: [
      {
        id: "kettle-start",
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
        demoClips: [{ label: "Upward Wave · Start Kettle", src: demoWaveUp }],
        gestureNote: "Gesture Detect:",
        voiceNote: "Voice Command Detect:",
      },
    ],
  },
  2: {
    title: "Feature 2: Coffee Maker",
    steps: [
      {
        id: "coffee-activate",
        demoLabel: "Wave Downward to activate the coffee machine",
        instructions: [
          {
            heading: "Activate Machine:",
            items: ["👋 Downward wave to wake", "Light ring turns solid when ready"],
          },
          {
            heading: "Voice Support:",
            items: ["Start (English) / 開始", "Stop (English) / 停止"],
          },
        ],
        demoClips: [{ label: "Downward Wave · Activate Machine", src: demoWaveDown }],
        gestureNote: "Gesture Detect:",
        voiceNote: "Voice Command Detect:",
      },
      {
        id: "coffee-espresso",
        demoLabel: "Make Espresso with a Fist",
        instructions: [
          {
            heading: "Select Size Gesture:",
            items: ["✊ Fist: Espresso"],
          },
          {
            heading: "Stop Anytime:",
            items: ["Bring palms together to cancel", "Voice Stop (停止)"],
          },
        ],
        demoClips: [{ label: "Fist · Espresso", src: demoFist }],
        gestureNote: "Gesture Detect:",
        voiceNote: "Voice Command Detect:",
      },
      {
        id: "coffee-lungo",
        demoLabel: "Make Lungo with a Palm",
        instructions: [
          {
            heading: "Select Size Gesture:",
            items: ["✋ Palm: Lungo"],
          },
          {
            heading: "Stop Anytime:",
            items: ["Bring palms together to cancel", "Voice Stop (停止)"],
          },
        ],
        demoClips: [{ label: "Palm · Lungo", src: demoPalm }],
        gestureNote: "Gesture Detect:",
        voiceNote: "Voice Command Detect:",
      },
    ],
  },
  3: {
    title: "Feature 3: Smart Oven",
    steps: [
      {
        id: "oven-heat",
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
        demoClips: [{ label: "Push · Start Heating", src: demoPush }],
        gestureNote: "Gesture Detect:",
        voiceNote: "Voice Command Detect:",
      },
    ],
  },
  4: {
    title: "Feature 4: Emergency Stop",
    steps: [
      {
        id: "stop-all",
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
        demoClips: [{ label: "Two-Hand Palm · Stop All", src: demoTwoHand }],
        gestureNote: "Gesture Detect:",
        voiceNote: "Voice Command Detect:",
      },
    ],
  },
};

export default function GuideBoard({
  guideState,
  tutorialPage,
  onSelectTutorialPage,
  detectionStatus,
  onGestureDetected,
}: GuideBoardProps) {
  if (guideState === "manual") {
    return <ManualBoard detectionStatus={detectionStatus} onGestureDetected={onGestureDetected} />;
  }

  return (
    <TutorialBoard
      page={tutorialPage}
      onSelectPage={onSelectTutorialPage}
      detectionStatus={detectionStatus}
      onGestureDetected={onGestureDetected}
    />
  );
}

function TutorialBoard({
  page,
  onSelectPage,
  detectionStatus,
  onGestureDetected,
}: {
  page: number;
  onSelectPage: (page: number) => void;
  detectionStatus: DetectionStatus;
  onGestureDetected?: (signal: GestureSignal) => void;
}) {
  const content = tutorialContent[page] ?? tutorialContent[1];
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    setStepIndex(0);
  }, [page]);

  const steps = content.steps.length ? content.steps : tutorialContent[1].steps;
  const currentStep = steps[stepIndex % steps.length];
  const hasMultipleSteps = steps.length > 1;
  const isLastStep = stepIndex >= steps.length - 1;
  const gesturePositive = detectionStatus.gesture !== "NONE";
  const voicePositive = detectionStatus.voice !== "NONE";

  const handleNextAction = () => {
    if (!isLastStep) {
      setStepIndex((prev) => Math.min(prev + 1, steps.length - 1));
      return;
    }

    onSelectPage(nextTutorialPage(page));
  };

  return (
    <div className="tutorial-layout">
      <header className="tutorial-top">
        <div>
          <h1>{content.title}</h1>
          {hasMultipleSteps && (
            <p className="tutorial-action-indicator">
              Action {stepIndex + 1} / {steps.length}
            </p>
          )}
        </div>
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
            onGestureChange={onGestureDetected}
          />
          <div className="status-block">
            <span className="status-label">{currentStep.gestureNote ?? "Gesture Detect:"}</span>
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
          {currentStep.demoClips?.length ? (
            <div
              className={
                currentStep.demoClips.length > 1
                  ? "demo-gallery demo-gallery--multi"
                  : "demo-gallery"
              }
            >
              {currentStep.demoClips.map((clip) => (
                <figure key={clip.label} className="demo-card">
                  <div className="demo-frame">
                    <video
                      className="demo-video"
                      src={clip.src}
                      autoPlay
                      loop
                      muted
                      playsInline
                      controls
                    >
                      Your browser does not support the video tag.
                    </video>
                  </div>
                  <figcaption className="demo-caption">{clip.label}</figcaption>
                </figure>
              ))}
            </div>
          ) : (
            <>
              <div className="demo-frame">
                <div className="demo-placeholder" aria-hidden="true" />
              </div>
              <span className="demo-caption">{currentStep.demoLabel}</span>
            </>
          )}
          {currentStep.demoClips?.length ? (
            <p className="demo-caption demo-caption--note">{currentStep.demoLabel}</p>
          ) : null}
          <div className="status-block">
            <span className="status-label">{currentStep.voiceNote ?? "Voice Command Detect:"}</span>
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
          {currentStep.instructions.map((group) => (
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
        <button
          type="button"
          className="step-button"
          onClick={handleNextAction}
        >
          NEXT ACTION / DEVICE -&gt;
        </button>
      </footer>
    </div>
  );
}

function ManualBoard({
  detectionStatus,
  onGestureDetected,
}: {
  detectionStatus: DetectionStatus;
  onGestureDetected?: (signal: GestureSignal) => void;
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
          onGestureChange={onGestureDetected}
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
