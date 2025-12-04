import { useState } from "react";
import "./App.css";
import type { BoardState, GuideSubState } from "./types";
import NavSidebar from "./components/NavSidebar";
import HomeBoard from "./components/HomeBoard";
import GuideBoard from "./components/GuideBoard";
import LogBoard from "./components/LogBoard";
import SettingBoard from "./components/SettingBoard";
import { useControlManager } from "./hooks/useControlManager";

export default function App() {
  const [boardState, setBoardState] = useState<BoardState>("home");
  const [guideState, setGuideState] = useState<GuideSubState>("tutorial");
  const [colorblindMode, setColorblindMode] = useState(false);
  const [meetingMode, setMeetingMode] = useState(false);
  const [tutorialPage, setTutorialPage] = useState(1);

  const {
    deviceSummaries,
    deviceCards,
    detectionStatus,
    logSummaryItems,
    timelineItems,
    logCount,
    handleStopAll,
    handleClearLog,
    handleExportLog,
  } = useControlManager();

  const handleSelectBoard = (state: BoardState) => {
    setBoardState(state);
    if (state === "guide") {
      setGuideState("tutorial");
      setTutorialPage(1);
    }
  };

  const handleSelectGuide = (state: GuideSubState) => {
    setBoardState("guide");
    setGuideState(state);
    setTutorialPage(1);
  };

  const renderBoard = () => {
    switch (boardState) {
      case "guide":
        return (
          <GuideBoard
            guideState={guideState}
            tutorialPage={tutorialPage}
            onSelectTutorialPage={setTutorialPage}
            detectionStatus={detectionStatus}
          />
        );
      case "log":
        return (
          <LogBoard
            total={logCount}
            summaryItems={logSummaryItems}
            timelineItems={timelineItems}
            onExport={handleExportLog}
            onClear={handleClearLog}
          />
        );
      case "setting":
        return <SettingBoard />;
      case "home":
      default: {
        // Manual controls intentionally omitted until the module is reworked.
        return (
          <HomeBoard
            colorblindMode={colorblindMode}
            meetingMode={meetingMode}
            detectionStatus={detectionStatus}
            deviceSummaries={deviceSummaries}
            deviceCards={deviceCards}
            onToggleColorblind={() => setColorblindMode((prev) => !prev)}
            onToggleMeeting={() => setMeetingMode((prev) => !prev)}
          />
        );
      }
    }
  };

  return (
    <div className="control-board">
      <NavSidebar
        boardState={boardState}
        guideState={guideState}
        onSelectBoard={handleSelectBoard}
        onSelectGuide={handleSelectGuide}
        onStopAll={handleStopAll}
      />
      <main className="board">{renderBoard()}</main>
    </div>
  );
}
