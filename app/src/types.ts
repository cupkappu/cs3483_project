export type BoardState = "home" | "guide" | "log" | "setting";
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

export type CoffeeSize = "espresso" | "lungo";

export interface LogEntry {
	id: string;
	timestamp: string;
	action: ControlAction;
	message: string;
	source: ControlSource;
}

export interface KettleState {
	status: "idle" | "boiling" | "ready" | "cooling" | "water-empty";
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

export interface DeviceHeroSummary {
	id: DeviceId;
	label: string;
	iconSrc: string;
	iconAlt: string;
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
	updatedAt: string;
}

export interface DevicePollingSnapshot {
	devices: DeviceStatusDto[];
	fetchedAt: string;
}
