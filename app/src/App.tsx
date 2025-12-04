import { useCallback, useMemo, useState } from "react";
import "./App.css";
import type {
  BoardState,
  ControlAction,
  ControlSource,
  DetectionStatus,
  DeviceCardInfo,
  DeviceHeroSummary,
  DevicesState,
  GuideSubState,
  LogEntry,
  LogSummaryItem,
  LogTimelineItem,
  ManualControlSection,
} from "./types";
import NavSidebar from "./components/NavSidebar";
import HomeBoard from "./components/HomeBoard";
import GuideBoard from "./components/GuideBoard";
import LogBoard from "./components/LogBoard";
import SettingBoard from "./components/SettingBoard";
import kettleImg from "./assets/Kettle.png";
import kettleEmptyImg from "./assets/KettleEmpty.png";
import kettleFullImg from "./assets/KettleFull.png";
import coffeeImg from "./assets/CoffeeCup.png";
import coffeeEspressoImg from "./assets/CoffeeCupEspresso.png";
import coffeeLungoImg from "./assets/CoffeeCupLungo.png";
import ovenImg from "./assets/oven.png";
import ovenHeatingImg from "./assets/OvenHalf.png";

const MAX_LOG_ENTRIES = 50;

const INITIAL_DEVICES: DevicesState = {
  kettle: {
    status: "ready",
    temperature: 85,
    targetTemperature: 85,
    timeRemaining: 0,
  },
  coffee: {
    status: "needs-capsule",
    lastSize: null,
  },
  oven: {
    status: "heating",
    temperature: 120,
    timeRemaining: 64,
  },
};

const ACTION_CONFIG: Record<ControlAction, { message: string; detection?: Partial<DetectionStatus> }> = {
  kettle_start: {
    message: "Water kettle started (manual)",
    detection: { gesture: "Manual: Start Kettle" },
  },
  kettle_ready: {
    message: "Water kettle marked ready",
    detection: { gesture: "Manual: Kettle Ready" },
  },
  kettle_stop: {
    message: "Water kettle stopped",
    detection: { gesture: "Manual: Stop Kettle" },
  },
  kettle_empty: {
    message: "Water kettle flagged empty",
    detection: { gesture: "Manual: Kettle Empty" },
  },
  kettle_refill: {
    message: "Water kettle refilled",
    detection: { gesture: "Manual: Kettle Refilled" },
  },
  coffee_brew_espresso: {
    message: "Coffee brewing (espresso)",
    detection: { gesture: "Manual: Brew Espresso" },
  },
  coffee_ready_espresso: {
    message: "Espresso ready to serve",
    detection: { gesture: "Manual: Espresso Ready" },
  },
  coffee_brew_lungo: {
    message: "Coffee brewing (lungo)",
    detection: { gesture: "Manual: Brew Lungo" },
  },
  coffee_ready_lungo: {
    message: "Lungo ready to serve",
    detection: { gesture: "Manual: Lungo Ready" },
  },
  coffee_capsule_empty: {
    message: "Coffee capsule marked empty",
    detection: { gesture: "Manual: Capsule Empty" },
  },
  coffee_capsule_load: {
    message: "Coffee capsule loaded",
    detection: { gesture: "Manual: Capsule Loaded" },
  },
  coffee_reset: {
    message: "Coffee machine reset",
    detection: { gesture: "Manual: Coffee Reset" },
  },
  oven_start: {
    message: "Oven heating started",
    detection: { gesture: "Manual: Start Oven" },
  },
  oven_ready: {
    message: "Oven ready",
    detection: { gesture: "Manual: Oven Ready" },
  },
  oven_stop: {
    message: "Oven stopped",
    detection: { gesture: "Manual: Stop Oven" },
  },
  stop_all: {
    message: "Emergency stop triggered",
    detection: { gesture: "Manual: STOP ALL", voice: "Manual: STOP" },
  },
};

const MANUAL_SECTIONS: ManualControlSection[] = [
  {
    id: "kettle",
    title: "Water Kettle",
    actions: [
      { id: "kettle_start", label: "Start Boiling", tone: "primary" },
      { id: "kettle_ready", label: "Mark Ready" },
      { id: "kettle_stop", label: "Stop" },
      { id: "kettle_empty", label: "Set Empty", tone: "danger" },
      { id: "kettle_refill", label: "Refill Water" },
    ],
  },
  {
    id: "coffee",
    title: "Coffee Maker",
    actions: [
      { id: "coffee_brew_espresso", label: "Brew Espresso", tone: "primary" },
      { id: "coffee_ready_espresso", label: "Espresso Ready" },
      { id: "coffee_brew_lungo", label: "Brew Lungo", tone: "primary" },
      { id: "coffee_ready_lungo", label: "Lungo Ready" },
      { id: "coffee_capsule_empty", label: "Set Capsule Empty", tone: "danger" },
      { id: "coffee_capsule_load", label: "Load Capsule" },
      { id: "coffee_reset", label: "Reset Machine" },
    ],
  },
  {
    id: "oven",
    title: "Oven",
    actions: [
      { id: "oven_start", label: "Start Heating", tone: "primary" },
      { id: "oven_ready", label: "Mark Ready" },
      { id: "oven_stop", label: "Stop" },
    ],
  },
  {
    id: "global",
    title: "Global",
    actions: [{ id: "stop_all", label: "Emergency Stop", tone: "danger" }],
  },
];

const formatTime = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "--:--";
  }
  return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
};

const formatSize = (size: "espresso" | "lungo" | null) =>
  size ? size.charAt(0).toUpperCase() + size.slice(1) : "";

const createLogId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
};

export default function App() {
	const [boardState, setBoardState] = useState<BoardState>("home");
	const [guideState, setGuideState] = useState<GuideSubState>("tutorial");
	const [colorblindMode, setColorblindMode] = useState(false);
	const [meetingMode, setMeetingMode] = useState(false);
	const [tutorialPage, setTutorialPage] = useState(1);
	const [devices, setDevices] = useState<DevicesState>(INITIAL_DEVICES);
	const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
	const [detectionStatus, setDetectionStatus] = useState<DetectionStatus>({
		gesture: "NONE",
		voice: "NONE",
	});

	const appendLog = useCallback(
		(action: ControlAction, message: string, source: ControlSource) => {
			setLogEntries((prev) => {
				const entry: LogEntry = {
					id: createLogId(),
					timestamp: new Date().toISOString(),
					action,
					message,
					source,
				};
				const next = [...prev, entry];
				return next.slice(-MAX_LOG_ENTRIES);
			});
		},
		[],
	);

	// Future integrations (gesture / voice) can call this helper with a different source flag.
	const performAction = useCallback(
		(action: ControlAction, source: ControlSource = "manual") => {
			const config = ACTION_CONFIG[action];
			if (!config) {
				return;
			}

			setDevices((prev) => {
				const next: DevicesState = {
					kettle: { ...prev.kettle },
					coffee: { ...prev.coffee },
					oven: { ...prev.oven },
				};

				switch (action) {
					case "kettle_start":
						next.kettle.status = "boiling";
						next.kettle.timeRemaining = 64;
						next.kettle.temperature = next.kettle.targetTemperature;
						break;
					case "kettle_ready":
						next.kettle.status = "ready";
						next.kettle.timeRemaining = 0;
						break;
					case "kettle_stop":
						next.kettle.status = "idle";
						next.kettle.timeRemaining = null;
						break;
					case "kettle_empty":
						next.kettle.status = "water-empty";
						next.kettle.timeRemaining = null;
						break;
					case "kettle_refill":
						next.kettle.status = "idle";
						next.kettle.timeRemaining = null;
						break;
					case "coffee_brew_espresso":
						next.coffee.status = "brewing";
						next.coffee.lastSize = "espresso";
						break;
					case "coffee_ready_espresso":
						next.coffee.status = "espresso-ready";
						next.coffee.lastSize = "espresso";
						break;
					case "coffee_brew_lungo":
						next.coffee.status = "brewing";
						next.coffee.lastSize = "lungo";
						break;
					case "coffee_ready_lungo":
						next.coffee.status = "lungo-ready";
						next.coffee.lastSize = "lungo";
						break;
					case "coffee_capsule_empty":
						next.coffee.status = "needs-capsule";
						break;
					case "coffee_capsule_load":
						next.coffee.status = "idle";
						break;
					case "coffee_reset":
						next.coffee.status = "idle";
						next.coffee.lastSize = null;
						break;
					case "oven_start":
						next.oven.status = "heating";
						next.oven.timeRemaining = 64;
						break;
					case "oven_ready":
						next.oven.status = "ready";
						next.oven.timeRemaining = 0;
						break;
					case "oven_stop":
						next.oven.status = "idle";
						next.oven.timeRemaining = null;
						break;
					case "stop_all":
						next.kettle = {
							...next.kettle,
							status: "idle",
							timeRemaining: null,
						};
						next.coffee = {
							...next.coffee,
							status: "idle",
						};
						next.oven = {
							...next.oven,
							status: "idle",
							timeRemaining: null,
						};
						break;
					default:
						return prev;
				}

				return next;
			});

			appendLog(action, config.message, source);

			if (config.detection) {
				setDetectionStatus((prev) => ({
					gesture: config.detection?.gesture ?? prev.gesture,
					voice: config.detection?.voice ?? prev.voice,
				}));
			}
		},
		[appendLog],
	);

	const handleManualAction = useCallback(
		(action: ControlAction) => {
			performAction(action, "manual");
		},
		[performAction],
	);

	const handleStopAll = useCallback(() => {
		performAction("stop_all", "manual");
	}, [performAction]);

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

	const handleClearLog = useCallback(() => {
		setLogEntries([]);
	}, []);

	const handleExportLog = useCallback(() => {
		if (!logEntries.length) {
			return;
		}
		if (typeof window === "undefined") {
			return;
		}

		const header = "timestamp,action,message,source";
		const rows = logEntries.map((entry) => {
			const timestamp = new Date(entry.timestamp).toLocaleString();
			const escapedMessage = entry.message.replace(/"/g, '""');
			return [timestamp, entry.action, escapedMessage, entry.source]
				.map((cell) => `"${cell}"`)
				.join(",");
		});
		const csv = [header, ...rows].join("\n");
		const blob = new Blob([csv], { type: "text/csv" });
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement("a");
		anchor.href = url;
		anchor.download = `smart-kitchen-log-${Date.now()}.csv`;
		anchor.click();
		URL.revokeObjectURL(url);
	}, [logEntries]);

	const deviceSummaries = useMemo<DeviceHeroSummary[]>(() => {
		const { kettle, coffee, oven } = devices;

		const kettleLabel = (() => {
			switch (kettle.status) {
				case "boiling":
					return kettle.timeRemaining
						? `Boiling (${kettle.timeRemaining}s)`
						: "Boiling";
				case "ready":
					return "Ready";
				case "water-empty":
					return "Needs Water";
				default:
					return "Standby";
			}
		})();

		const coffeeLabel = (() => {
			switch (coffee.status) {
				case "brewing":
					return coffee.lastSize
						? `Brewing ${formatSize(coffee.lastSize)}`
						: "Brewing";
				case "espresso-ready":
					return "Espresso Ready";
				case "lungo-ready":
					return "Lungo Ready";
				case "needs-capsule":
					return "Capsule Empty";
				default:
					return "Standby";
			}
		})();

		const ovenLabel = (() => {
			switch (oven.status) {
				case "heating":
					return oven.timeRemaining
						? `Heating (${oven.timeRemaining}s)`
						: "Heating";
				case "ready":
					return "Ready";
				default:
					return "Standby";
			}
		})();

		const kettleIcon = (() => {
			switch (kettle.status) {
				case "water-empty":
					return { src: kettleEmptyImg, alt: "Kettle out of water" };
				case "ready":
					return { src: kettleFullImg, alt: "Kettle ready" };
				default:
					return { src: kettleImg, alt: "Water kettle" };
			}
		})();

		const kettleStatusIcon = (() => {
			switch (kettle.status) {
				case "ready":
					return "✓";
				case "boiling":
					return "◎";
				case "water-empty":
					return "!";
				default:
					return "–";
			}
		})();

		const coffeeIcon = (() => {
			switch (coffee.status) {
				case "espresso-ready":
					return { src: coffeeEspressoImg, alt: "Espresso ready" };
				case "lungo-ready":
					return { src: coffeeLungoImg, alt: "Lungo ready" };
				default:
					return { src: coffeeImg, alt: "Coffee maker" };
			}
		})();

		const coffeeStatusIcon = (() => {
			switch (coffee.status) {
				case "needs-capsule":
					return "✕";
				case "brewing":
					return "◎";
				case "espresso-ready":
				case "lungo-ready":
					return "✓";
				default:
					return "–";
			}
		})();

		const ovenIcon = (() => {
			switch (oven.status) {
				case "heating":
					return { src: ovenHeatingImg, alt: "Oven heating" };
				default:
					return { src: ovenImg, alt: "Oven" };
			}
		})();

		const ovenStatusIcon = (() => {
			switch (oven.status) {
				case "heating":
					return "◎";
				case "ready":
					return "✓";
				default:
					return "–";
			}
		})();

		return [
			{
				id: "kettle",
				label: "Water Kettle",
				iconSrc: kettleIcon.src,
				iconAlt: kettleIcon.alt,
				variant: "device-hero--kettle",
				statusIcon: kettleStatusIcon,
				statusLabel: kettleLabel,
			},
			{
				id: "coffee",
				label: "Coffee Maker",
				iconSrc: coffeeIcon.src,
				iconAlt: coffeeIcon.alt,
				variant: "device-hero--capsule",
				statusIcon: coffeeStatusIcon,
				statusLabel: coffeeLabel,
			},
			{
				id: "oven",
				label: "Oven",
				iconSrc: ovenIcon.src,
				iconAlt: ovenIcon.alt,
				variant: "device-hero--oven",
				statusIcon: ovenStatusIcon,
				statusLabel: ovenLabel,
			},
		];
	}, [devices]);

	const deviceCards = useMemo<DeviceCardInfo[]>(() => {
		const { kettle, coffee, oven } = devices;

		const kettleVariant =
			kettle.status === "boiling"
				? "device-card--warning"
				: kettle.status === "water-empty"
				?
					"device-card--alert"
				: "device-card--idle";

		const kettleState = (() => {
			switch (kettle.status) {
				case "boiling":
					return "Boiling";
				case "ready":
					return "Ready";
				case "water-empty":
					return "Water Empty";
				default:
					return "Standby";
			}
		})();

		const kettleFooter = (() => {
			switch (kettle.status) {
				case "boiling":
					return kettle.timeRemaining ? `${kettle.timeRemaining} s` : "Heating";
				case "ready":
					return "Ready";
				case "water-empty":
					return "Empty";
				default:
					return "Idle";
			}
		})();

		const coffeeVariant =
			coffee.status === "needs-capsule"
				? "device-card--alert"
				: coffee.status === "brewing"
				?
					"device-card--warning"
				: "device-card--idle";

		const coffeeState = (() => {
			switch (coffee.status) {
				case "brewing":
					return coffee.lastSize
						? `Brewing ${formatSize(coffee.lastSize)}`
						: "Brewing";
				case "espresso-ready":
					return "Espresso Ready";
				case "lungo-ready":
					return "Lungo Ready";
				case "needs-capsule":
					return "Capsule Empty";
				default:
					return "Idle";
			}
		})();

		const coffeeDetail = (() => {
			switch (coffee.status) {
				case "brewing":
					return coffee.lastSize
						? `${formatSize(coffee.lastSize)} in progress`
						: "Brewing";
				case "espresso-ready":
				case "lungo-ready":
					return "Serve immediately";
				case "needs-capsule":
					return "Insert capsule";
				default:
					return coffee.lastSize
						? `${formatSize(coffee.lastSize)} last brew`
						: "Standby";
			}
		})();

		const coffeeFooter = (() => {
			switch (coffee.status) {
				case "brewing":
				case "espresso-ready":
				case "lungo-ready":
					return coffee.lastSize ? formatSize(coffee.lastSize) : "Brew";
				case "needs-capsule":
					return "Capsule";
				default:
					return "Idle";
			}
		})();

		const ovenVariant =
			oven.status === "heating"
				? "device-card--warning"
				: oven.status === "ready"
				?
					"device-card--idle"
				: "device-card--idle";

		const ovenState = (() => {
			switch (oven.status) {
				case "heating":
					return "Heating";
				case "ready":
					return "Ready";
				default:
					return "Idle";
			}
		})();

		const ovenFooter = (() => {
			switch (oven.status) {
				case "heating":
					return oven.timeRemaining ? `${oven.timeRemaining} s` : "Heating";
				case "ready":
					return "Ready";
				default:
					return "Idle";
			}
		})();

		return [
			{
				id: "card-kettle",
				state: kettleState,
				detail:
					kettle.status === "water-empty"
						? "Refill water"
						: `${kettle.targetTemperature} °C`,
				footerLabel: kettleFooter,
				variant: kettleVariant,
			},
			{
				id: "card-coffee",
				state: coffeeState,
				detail: coffeeDetail,
				footerLabel: coffeeFooter,
				variant: coffeeVariant,
			},
			{
				id: "card-oven",
				state: ovenState,
				detail: `${oven.temperature} °C`,
				footerLabel: ovenFooter,
				variant: ovenVariant,
			},
		];
	}, [devices]);

	const logSummaryItems = useMemo<LogSummaryItem[]>(() => {
		const counts = {
			water: 0,
			coffee: 0,
			oven: 0,
			stop: 0,
		};

		logEntries.forEach(({ action }) => {
			switch (action) {
				case "kettle_start":
				case "kettle_ready":
				case "kettle_stop":
				case "kettle_empty":
				case "kettle_refill":
					counts.water += 1;
					break;
				case "coffee_brew_espresso":
				case "coffee_ready_espresso":
				case "coffee_brew_lungo":
				case "coffee_ready_lungo":
				case "coffee_capsule_empty":
				case "coffee_capsule_load":
				case "coffee_reset":
					counts.coffee += 1;
					break;
				case "oven_start":
				case "oven_ready":
				case "oven_stop":
					counts.oven += 1;
					break;
				case "stop_all":
					counts.stop += 1;
					break;
				default:
					break;
			}
		});

		return [
			{ id: "water", label: "Water", value: counts.water },
			{ id: "coffee", label: "Coffee", value: counts.coffee },
			{ id: "oven", label: "Oven", value: counts.oven },
			{ id: "stop", label: "Stop", value: counts.stop },
		].filter((item) => item.value > 0);
	}, [logEntries]);

	const timelineItems = useMemo<LogTimelineItem[]>(() =>
		[...logEntries]
			.slice(-6)
			.reverse()
			.map((entry) => ({
				id: entry.id,
				time: formatTime(entry.timestamp),
				text: entry.message,
				variant: entry.action === "stop_all" ? "alert" : undefined,
			})),
	[logEntries]);

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
						total={logEntries.length}
						summaryItems={logSummaryItems}
						timelineItems={timelineItems}
						onExport={handleExportLog}
						onClear={handleClearLog}
					/>
				);
			case "setting":
				return <SettingBoard />;
			case "home":
			default:
				return (
					<HomeBoard
						colorblindMode={colorblindMode}
						meetingMode={meetingMode}
						detectionStatus={detectionStatus}
						deviceSummaries={deviceSummaries}
						deviceCards={deviceCards}
						manualSections={MANUAL_SECTIONS}
						onToggleColorblind={() => setColorblindMode((prev) => !prev)}
						onToggleMeeting={() => setMeetingMode((prev) => !prev)}
						onManualAction={handleManualAction}
					/>
				);
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
