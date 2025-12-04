import { useState } from "react";
import "./App.css";
import type { BoardState, GuideSubState } from "./types";
import NavSidebar from "./components/NavSidebar";
import HomeBoard from "./components/HomeBoard";
import GuideBoard from "./components/GuideBoard";
import ManualControlBoard from "./components/ManualControlBoard";
import LogBoard from "./components/LogBoard";
import SettingBoard from "./components/SettingBoard";
import { useControlManager } from "./hooks/useControlManager";
import { ENABLE_MANUAL_TEST } from "./config/featureFlags";

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
    manualSections,
    actionAvailability,
    handleStopAll,
    handleClearLog,
    handleExportLog,
    handleManualAction,
    refreshDeviceStatus,
    latestSnapshot,
    lastActionResult,
  } = useControlManager();

  const handleSelectBoard = (state: BoardState) => {
    if (state === "manualControl" && !ENABLE_MANUAL_TEST) {
      setBoardState("home");
      return;
    }
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

  const renderHomeBoard = () => (
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
        return (
          <SettingBoard
            colorblindMode={colorblindMode}
            meetingMode={meetingMode}
            onToggleColorblind={() => setColorblindMode((prev) => !prev)}
            onToggleMeeting={() => setMeetingMode((prev) => !prev)}
          />
        );
      case "manualControl":
        if (ENABLE_MANUAL_TEST) {
          return (
            <ManualControlBoard
              sections={manualSections}
              detectionStatus={detectionStatus}
              latestSnapshot={latestSnapshot}
              onAction={handleManualAction}
              actionAvailability={actionAvailability}
              onRefresh={refreshDeviceStatus}
              timelineItems={timelineItems}
              lastActionResult={lastActionResult}
            />
          );
        }
        return renderHomeBoard();
      case "home":
      default: {
        return renderHomeBoard();
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
        showManualTest={ENABLE_MANUAL_TEST}
      />
      <main className="board">{renderBoard()}</main>
    </div>
  );
}
