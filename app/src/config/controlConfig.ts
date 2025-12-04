import type {
  ControlAction,
  DetectionStatus,
  DevicesState,
  ManualControlSection,
} from "../types";

export const MAX_LOG_ENTRIES = 50;

export const INITIAL_DEVICES: DevicesState = {
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

export const MANUAL_SECTIONS: ManualControlSection[] = [
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

export const ACTION_CONFIG: Record<
  ControlAction,
  { message: string; detection?: Partial<DetectionStatus> }
> = {
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
