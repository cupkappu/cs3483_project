import { useCallback, useState } from "react";
import type { ReactNode } from "react";
import "./App.css";
import "./styles/desktop-shell.css";
import type {
  BoardState,
  DetectionStatus,
  DeviceCardInfo,
  DeviceHeroSummary,
  DeviceId,
  GestureSignal,
  GuideSubState,
  LogSummaryItem,
  LogTimelineItem,
} from "./types";
import NavSidebar from "./components/NavSidebar";
import HomeBoard from "./components/HomeBoard";
import GuideBoard from "./components/GuideBoard";
import ManualControlBoard from "./components/ManualControlBoard";
import LogBoard from "./components/LogBoard";
import SettingBoard from "./components/SettingBoard";
import DesktopWindow from "./components/DesktopWindow";
import MiniStatusWindow from "./components/MiniStatusWindow";
import { useControlManager } from "./hooks/useControlManager";

type WindowId = "control" | "manual" | "mini";

interface WindowPosition {
  x: number;
  y: number;
}

interface WindowSize {
  width: number;
  height: number;
}

interface ControlWindowState {
  position: WindowPosition;
  size: WindowSize;
  isMinimized: boolean;
}

interface ManualWindowState {
  position: WindowPosition;
  size: WindowSize;
  isMinimized: boolean;
  isOpen: boolean;
}

interface MiniWindowState {
  position: WindowPosition;
  size: WindowSize;
  isMinimized: boolean;
  isOpen: boolean;
}

interface ControlBoardViewProps {
  boardState: BoardState;
  guideState: GuideSubState;
  colorblindMode: boolean;
  meetingMode: boolean;
  detectionStatus: DetectionStatus;
  deviceSummaries: DeviceHeroSummary[];
  deviceCards: DeviceCardInfo[];
  logSummaryItems: LogSummaryItem[];
  timelineItems: LogTimelineItem[];
  logCount: number;
  tutorialPage: number;
  ovenSettings: {
    targetTemperature: number;
    heatDuration: number;
  };
  onToggleColorblind: () => void;
  onToggleMeeting: () => void;
  onSelectBoard: (state: BoardState) => void;
  onSelectGuide: (state: GuideSubState) => void;
  onSelectTutorialPage: (page: number) => void;
  onStopAll: () => void;
  onClearLog: () => void;
  onExportLog: () => void;
  onUpdateOvenSettings: (settings: { targetTemperature: number; heatDuration: number }) => void;
  onResetOvenSettings: () => void;
  onGestureDetected: (signal: GestureSignal) => void;
  renderManualBoard: () => ReactNode;
}

function ControlBoardView({
  boardState,
  guideState,
  colorblindMode,
  meetingMode,
  detectionStatus,
  deviceSummaries,
  deviceCards,
  logSummaryItems,
  timelineItems,
  logCount,
  tutorialPage,
  ovenSettings,
  onToggleColorblind,
  onToggleMeeting,
  onSelectBoard,
  onSelectGuide,
  onSelectTutorialPage,
  onStopAll,
  onClearLog,
  onExportLog,
  onUpdateOvenSettings,
  onResetOvenSettings,
  onGestureDetected,
  renderManualBoard,
}: ControlBoardViewProps) {
  const renderHomeBoard = () => (
    <HomeBoard
      colorblindMode={colorblindMode}
      meetingMode={meetingMode}
      detectionStatus={detectionStatus}
      deviceSummaries={deviceSummaries}
      deviceCards={deviceCards}
      onToggleColorblind={onToggleColorblind}
      onToggleMeeting={onToggleMeeting}
      onGestureDetected={onGestureDetected}
    />
  );

  const renderBoard = () => {
    switch (boardState) {
      case "guide":
        return (
          <GuideBoard
            guideState={guideState}
            tutorialPage={tutorialPage}
            onSelectTutorialPage={onSelectTutorialPage}
            detectionStatus={detectionStatus}
            onGestureDetected={onGestureDetected}
          />
        );
      case "log":
        return (
          <LogBoard
            total={logCount}
            summaryItems={logSummaryItems}
            timelineItems={timelineItems}
            onExport={onExportLog}
            onClear={onClearLog}
          />
        );
      case "setting":
        return (
          <SettingBoard
            colorblindMode={colorblindMode}
            meetingMode={meetingMode}
            onToggleColorblind={onToggleColorblind}
            onToggleMeeting={onToggleMeeting}
            ovenSettings={ovenSettings}
            onUpdateOvenSettings={onUpdateOvenSettings}
            onResetOvenSettings={onResetOvenSettings}
            onGestureDetected={onGestureDetected}
          />
        );
      case "manualControl":
        return renderManualBoard();
      case "home":
      default:
        return renderHomeBoard();
    }
  };

  const rootClassName = colorblindMode ? "control-board colorblind-mode" : "control-board";

  return (
    <div className={rootClassName}>
      <NavSidebar
        boardState={boardState}
        guideState={guideState}
        onSelectBoard={onSelectBoard}
        onSelectGuide={onSelectGuide}
        onStopAll={onStopAll}
      />
      <main className="board">{renderBoard()}</main>
    </div>
  );
}

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
  handleGestureSignal,
    refreshDeviceStatus,
    latestSnapshot,
    lastActionResult,
    ovenSettings,
    updateOvenSettings,
    resetOvenSettings,
  } = useControlManager();

  const renderManualBoard = useCallback(
    () => (
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
    ),
    [
      manualSections,
      detectionStatus,
      latestSnapshot,
      handleManualAction,
      actionAvailability,
      refreshDeviceStatus,
      timelineItems,
      lastActionResult,
    ],
  );

  const [controlWindow, setControlWindow] = useState<ControlWindowState>({
    position: { x: 72, y: 64 },
    size: { width: 1080, height: 720 },
    isMinimized: false,
  });

  const [manualWindow, setManualWindow] = useState<ManualWindowState>({
    position: { x: 990, y: 96 },
    size: { width: 480, height: 640 },
    isMinimized: false,
    isOpen: true,
  });

  const [miniWindow, setMiniWindow] = useState<MiniWindowState>({
    position: { x: 1080, y: 140 },
    size: { width: 240, height: 220 },
    isMinimized: false,
    isOpen: true,
  });

  const [zOrder, setZOrder] = useState<WindowId[]>(["control", "manual", "mini"]);

  const bringToFront = (id: WindowId) => {
    setZOrder((order) => {
      const filtered = order.filter((item) => item !== id);
      return [...filtered, id];
    });
  };

  const zIndexFor = (id: WindowId) => {
    const index = zOrder.indexOf(id);
    return 200 + (index === -1 ? zOrder.length : index);
  };

  const ensureControlVisible = () => {
    setControlWindow((prev) => ({ ...prev, isMinimized: false }));
    bringToFront("control");
  };

  const ensureManualVisible = () => {
    setManualWindow((prev) => ({ ...prev, isOpen: true, isMinimized: false }));
    bringToFront("manual");
  };

  const ensureMiniVisible = () => {
    setMiniWindow((prev) => ({ ...prev, isOpen: true, isMinimized: false }));
    bringToFront("mini");
  };

  const handleSelectBoard = (state: BoardState) => {
    if (state === "manualControl") {
      ensureManualVisible();
      return;
    }
    setBoardState(state);
    if (state === "guide") {
      setGuideState("tutorial");
      setTutorialPage(1);
    }
    ensureControlVisible();
  };

  const handleSelectGuide = (state: GuideSubState) => {
    setBoardState("guide");
    setGuideState(state);
    setTutorialPage(1);
    ensureControlVisible();
  };

  const handleDeviceShortcut = (_deviceId: DeviceId) => {
    setBoardState("home");
    ensureControlVisible();
    bringToFront("control");
    bringToFront("mini");
  };

  const handleTaskbarToggle = (id: WindowId) => {
    if (id === "control") {
      setControlWindow((prev) => {
        if (prev.isMinimized) {
          bringToFront("control");
          return { ...prev, isMinimized: false };
        }
        bringToFront("control");
        return { ...prev, isMinimized: true };
      });
      return;
    }

    if (id === "manual") {
      setManualWindow((prev) => {
        if (!prev.isOpen) {
          bringToFront("manual");
          return { ...prev, isOpen: true, isMinimized: false };
        }
        if (prev.isMinimized) {
          bringToFront("manual");
          return { ...prev, isMinimized: false };
        }
        bringToFront("manual");
        return { ...prev, isMinimized: true };
      });
      return;
    }

    setMiniWindow((prev) => {
      if (!prev.isOpen) {
        bringToFront("mini");
        return { ...prev, isOpen: true, isMinimized: false };
      }
      if (prev.isMinimized) {
        bringToFront("mini");
        return { ...prev, isMinimized: false };
      }
      bringToFront("mini");
      return { ...prev, isMinimized: true };
    });
  };

  const taskbarItems: { id: WindowId; label: string }[] = [
    { id: "control", label: "Control Board" },
    { id: "manual", label: "Manual Control" },
    { id: "mini", label: "Device Status" },
  ];

  const controlBoard = (
    <ControlBoardView
      boardState={boardState}
      guideState={guideState}
      colorblindMode={colorblindMode}
      meetingMode={meetingMode}
      detectionStatus={detectionStatus}
      deviceSummaries={deviceSummaries}
      deviceCards={deviceCards}
      logSummaryItems={logSummaryItems}
      timelineItems={timelineItems}
      logCount={logCount}
      tutorialPage={tutorialPage}
      ovenSettings={ovenSettings}
      onToggleColorblind={() => setColorblindMode((prev) => !prev)}
      onToggleMeeting={() => setMeetingMode((prev) => !prev)}
      onSelectBoard={handleSelectBoard}
      onSelectGuide={handleSelectGuide}
      onSelectTutorialPage={setTutorialPage}
      onStopAll={handleStopAll}
      onClearLog={handleClearLog}
      onExportLog={handleExportLog}
      onUpdateOvenSettings={updateOvenSettings}
      onResetOvenSettings={resetOvenSettings}
      onGestureDetected={handleGestureSignal}
      renderManualBoard={renderManualBoard}
    />
  );

  const miniStatus = (
    <MiniStatusWindow
      meetingMode={meetingMode}
      deviceSummaries={deviceSummaries}
      onSelectDevice={handleDeviceShortcut}
    />
  );

  const isControlVisible = !controlWindow.isMinimized;
  const isManualVisible = manualWindow.isOpen && !manualWindow.isMinimized;
  const isMiniVisible = miniWindow.isOpen && !miniWindow.isMinimized;

  return (
    <div className="desktop-shell">
      <div className="desktop-workspace">
        {isControlVisible && (
          <DesktopWindow
            title="Smart Kitchen Console"
            position={controlWindow.position}
            size={controlWindow.size}
            zIndex={zIndexFor("control")}
            minWidth={880}
            minHeight={620}
            onFocus={() => bringToFront("control")}
            onMove={(position: WindowPosition) =>
              setControlWindow((prev) => ({ ...prev, position }))
            }
            onResize={(size: WindowSize, position: WindowPosition) =>
              setControlWindow((prev) => ({ ...prev, size, position }))
            }
            onMinimize={() =>
              setControlWindow((prev) => ({ ...prev, isMinimized: true }))
            }
          >
            {controlBoard}
          </DesktopWindow>
        )}

        {isManualVisible && (
          <DesktopWindow
            title="Manual Controls"
            position={manualWindow.position}
            size={manualWindow.size}
            zIndex={zIndexFor("manual")}
            minWidth={420}
            minHeight={380}
            onFocus={() => bringToFront("manual")}
            onMove={(position: WindowPosition) =>
              setManualWindow((prev) => ({ ...prev, position }))
            }
            onResize={(size: WindowSize, position: WindowPosition) =>
              setManualWindow((prev) => ({ ...prev, size, position }))
            }
            onMinimize={() =>
              setManualWindow((prev) => ({ ...prev, isMinimized: true }))
            }
            onClose={() =>
              setManualWindow((prev) => ({ ...prev, isOpen: false, isMinimized: false }))
            }
          >
            {renderManualBoard()}
          </DesktopWindow>
        )}

        {isMiniVisible && (
          <DesktopWindow
            title="Device Snapshot"
            position={miniWindow.position}
            size={miniWindow.size}
            zIndex={zIndexFor("mini")}
            minWidth={200}
            minHeight={170}
            onFocus={() => bringToFront("mini")}
            onMove={(position: WindowPosition) =>
              setMiniWindow((prev) => ({ ...prev, position }))
            }
            onResize={(size: WindowSize, position: WindowPosition) =>
              setMiniWindow((prev) => ({ ...prev, size, position }))
            }
            onMinimize={() =>
              setMiniWindow((prev) => ({ ...prev, isMinimized: true }))
            }
            onClose={() =>
              setMiniWindow((prev) => ({ ...prev, isOpen: false, isMinimized: false }))
            }
          >
            {miniStatus}
          </DesktopWindow>
        )}
      </div>

      <footer className="desktop-taskbar">
        <span className="desktop-taskbar__label">Apps</span>
        <div className="desktop-taskbar__items">
          {taskbarItems.map((item) => {
            const isActive = (() => {
              switch (item.id) {
                case "control":
                  return !controlWindow.isMinimized;
                case "manual":
                  return manualWindow.isOpen && !manualWindow.isMinimized;
                case "mini":
                  return miniWindow.isOpen && !miniWindow.isMinimized;
                default:
                  return false;
              }
            })();

            const isPinned = (() => {
              switch (item.id) {
                case "control":
                  return true;
                case "manual":
                  return manualWindow.isOpen;
                case "mini":
                  return miniWindow.isOpen;
                default:
                  return false;
              }
            })();
            return (
              <button
                key={item.id}
                type="button"
                className={
                  isActive
                    ? "desktop-taskbar__button desktop-taskbar__button--active"
                    : "desktop-taskbar__button"
                }
                data-pinned={isPinned ? "true" : "false"}
                onClick={() => handleTaskbarToggle(item.id)}
              >
                {item.label}
              </button>
            );
          })}
        </div>
        <div className="desktop-taskbar__spacer" />
        <button
          type="button"
          className="desktop-taskbar__button"
          onClick={() => {
            ensureControlVisible();
            ensureManualVisible();
            ensureMiniVisible();
          }}
        >
          Show All
        </button>
      </footer>
    </div>
  );
}
