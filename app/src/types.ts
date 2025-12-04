export type BoardState = "home" | "guide" | "log" | "setting" | "manualControl";
export type GuideSubState = "tutorial" | "manual";

export type DeviceId = "kettle" | "coffee" | "oven";

export type ControlSource = "manual" | "gesture" | "voice";

export type ControlAction =
	| "kettle_start"
	| "kettle_ready"
	| "kettle_stop"
	| "kettle_empty"
	| "kettle_refill"
	| "coffee_activate"
	| "coffee_select_espresso"
	| "coffee_select_lungo"
	| "coffee_cancel"
	| "coffee_capsule_empty"
	| "coffee_capsule_load"
	| "oven_preheat"
	| "oven_start_heat"
	| "oven_stop"
	| "stop_all";

export const GestureSignal = {
	UpwardWave: "UpwardWave",
	DownwardWave: "DownwardWave",
	Fist: "Fist",
	Palm: "Palm",
	PushForward: "PushForward",
	TwoHandPalm: "TwoHandPalm",
	None: "None",
} as const;

export type GestureSignal = (typeof GestureSignal)[keyof typeof GestureSignal];

export type GestureSignalActionMap = Partial<Record<GestureSignal, ControlAction>>;

export type GestureSignalHandler = (signal: GestureSignal) => void;

export interface HandKeypoint {
	x: number;
	y: number;
	z?: number;
	name?: string;
}

export interface HandPoseDetection {
	confidence: number;
	handedness?: string;
	keypoints: HandKeypoint[];
	keypoints3D: HandKeypoint[];
}

export interface HandFrame {
	timestamp: number;
	hands: HandPoseDetection[];
}

export type CoffeeSize = "espresso" | "lungo";

export interface LogEntry {
	id: string;
	timestamp: string;
	action: ControlAction;
	message: string;
	source: ControlSource;
}

export interface ControlActionResult {
	success: boolean;
	message: string;
	level: "info" | "warning";
}

export interface KettleState {
	status:
		| "idle"
		| "boiling"
		| "ready"
		| "cooling"
		| "water-empty"
		| "refilling";
	temperature: number;
	targetTemperature: number;
	timeRemaining: number | null;
	timeTotal: number | null;
}

export interface CoffeeState {
	status: "idle" | "waiting-selection" | "brewing" | "ready" | "needs-capsule";
	selectedSize: CoffeeSize | null;
	lastSize: CoffeeSize | null;
	timeRemaining: number | null;
	timeTotal: number | null;
}

export interface OvenState {
	status: "idle" | "preheating" | "heating" | "ready";
	temperature: number;
	targetTemperature: number;
	timeRemaining: number | null;
	timeTotal: number | null;
}

export interface DevicesState {
	kettle: KettleState;
	coffee: CoffeeState;
	oven: OvenState;
}

export interface DetectionStatus {
	gesture: string;
	voice: string;
}

export interface DeviceHeroMedia {
	kind: "image" | "video";
	src: string;
	alt: string;
	poster?: string;
	autoPlay?: boolean;
	loop?: boolean;
	muted?: boolean;
}

export interface DeviceHeroSummary {
	id: DeviceId;
	label: string;
	media: DeviceHeroMedia;
	variant: string;
	statusIcon: string;
	statusLabel: string;
}

export interface DeviceCardInfo {
	id: string;
	state: string;
	detail: string;
	footerLabel: string;
	variant: string;
	progress?: number;
	isActive?: boolean;
}

export interface ManualControlAction {
	id: ControlAction;
	label: string;
	tone?: "default" | "primary" | "danger";
}

export interface ManualControlSection {
	id: string;
	title: string;
	actions: ManualControlAction[];
}

export interface LogSummaryItem {
	id: string;
	label: string;
	value: number;
}

export interface LogTimelineItem {
	id: string;
	time: string;
	text: string;
	variant?: "alert";
}

export interface DeviceStatusDto {
	id: DeviceId;
	status: string;
	remainingSeconds?: number | null;
	totalSeconds?: number | null;
	temperature?: number | null;
	targetTemperature?: number | null;
	selectedSize?: CoffeeSize | null;
	lastSize?: CoffeeSize | null;
	constraint?: string | null;
	updatedAt: string;
}

export interface DevicePollingSnapshot {
	devices: DeviceStatusDto[];
	fetchedAt: string;
}

export interface ActionAvailability {
	available: boolean;
	reason?: string;
}

export type ActionAvailabilityMap = Record<ControlAction, ActionAvailability>;
