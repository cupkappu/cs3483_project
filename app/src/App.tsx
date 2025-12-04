import { useState } from "react";
import "./App.css";
import "./styles/desktop-shell.css";
import type {
  ActionAvailabilityMap,
  BoardState,
  ControlAction,
  ControlActionResult,
  DetectionStatus,
  DeviceCardInfo,
  DeviceHeroSummary,
  DeviceId,
  DevicePollingSnapshot,
  GuideSubState,
  LogSummaryItem,
  LogTimelineItem,
  ManualControlSection,
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
import { ENABLE_MANUAL_TEST } from "./config/featureFlags";

type WindowId = "control" | "mini";

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
  manualSections: ManualControlSection[];
  actionAvailability: ActionAvailabilityMap;
  logSummaryItems: LogSummaryItem[];
  timelineItems: LogTimelineItem[];
  logCount: number;
  latestSnapshot: DevicePollingSnapshot | null;
  lastActionResult: ControlActionResult | null;
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
  onManualAction: (action: ControlAction) => ControlActionResult;
  onRefreshDevices: () => Promise<DevicePollingSnapshot>;
  onStopAll: () => void;
  onClearLog: () => void;
  onExportLog: () => void;
  onUpdateOvenSettings: (settings: { targetTemperature: number; heatDuration: number }) => void;
  onResetOvenSettings: () => void;
}

function ControlBoardView({
  boardState,
  guideState,
  colorblindMode,
  meetingMode,
  detectionStatus,
  deviceSummaries,
  deviceCards,
  manualSections,
  actionAvailability,
  logSummaryItems,
  timelineItems,
  logCount,
  latestSnapshot,
  lastActionResult,
  tutorialPage,
  ovenSettings,
  onToggleColorblind,
  onToggleMeeting,
  onSelectBoard,
  onSelectGuide,
  onSelectTutorialPage,
  onManualAction,
  onRefreshDevices,
  onStopAll,
  onClearLog,
  onExportLog,
  onUpdateOvenSettings,
  onResetOvenSettings,
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
          />
        );
      case "manualControl":
        if (ENABLE_MANUAL_TEST) {
          return (
            <ManualControlBoard
              sections={manualSections}
              detectionStatus={detectionStatus}
              latestSnapshot={latestSnapshot}
              onAction={onManualAction}
              actionAvailability={actionAvailability}
              onRefresh={onRefreshDevices}
              timelineItems={timelineItems}
              lastActionResult={lastActionResult}
            />
          );
        }
        return renderHomeBoard();
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
        showManualTest={ENABLE_MANUAL_TEST}
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
    refreshDeviceStatus,
    latestSnapshot,
    lastActionResult,
    ovenSettings,
    updateOvenSettings,
    resetOvenSettings,
  } = useControlManager();

  const [controlWindow, setControlWindow] = useState<ControlWindowState>({
    position: { x: 72, y: 64 },
    size: { width: 1080, height: 720 },
    isMinimized: false,
  });

  const [miniWindow, setMiniWindow] = useState<MiniWindowState>({
    position: { x: 1080, y: 140 },
    size: { width: 240, height: 220 },
    isMinimized: false,
    isOpen: true,
  });

  const [zOrder, setZOrder] = useState<WindowId[]>(["control", "mini"]);

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

  const ensureMiniVisible = () => {
    setMiniWindow((prev) => ({ ...prev, isOpen: true, isMinimized: false }));
    bringToFront("mini");
  };

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
      manualSections={manualSections}
      actionAvailability={actionAvailability}
      logSummaryItems={logSummaryItems}
      timelineItems={timelineItems}
      logCount={logCount}
      latestSnapshot={latestSnapshot}
      lastActionResult={lastActionResult}
      tutorialPage={tutorialPage}
      ovenSettings={ovenSettings}
      onToggleColorblind={() => setColorblindMode((prev) => !prev)}
      onToggleMeeting={() => setMeetingMode((prev) => !prev)}
      onSelectBoard={handleSelectBoard}
      onSelectGuide={handleSelectGuide}
      onSelectTutorialPage={setTutorialPage}
      onManualAction={handleManualAction}
      onRefreshDevices={refreshDeviceStatus}
      onStopAll={handleStopAll}
      onClearLog={handleClearLog}
      onExportLog={handleExportLog}
      onUpdateOvenSettings={updateOvenSettings}
      onResetOvenSettings={resetOvenSettings}
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
            const isActive =
              item.id === "control"
                ? !controlWindow.isMinimized
                : miniWindow.isOpen && !miniWindow.isMinimized;
            const isPinned = item.id === "control" || miniWindow.isOpen;
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
            ensureMiniVisible();
          }}
        >
          Show All
        </button>
      </footer>
    </div>
  );
}
