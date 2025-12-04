import type {
  ControlAction,
  DetectionStatus,
  DevicesState,
  ManualControlSection,
} from "../types";

export const MAX_LOG_ENTRIES = 50;

export const INITIAL_DEVICES: DevicesState = {
  kettle: {
    status: "idle",
    temperature: 26,
    targetTemperature: 100,
    timeRemaining: null,
    timeTotal: null,
  },
  coffee: {
    status: "needs-capsule",
    selectedSize: null,
    lastSize: null,
    timeRemaining: null,
    timeTotal: null,
  },
  oven: {
    status: "idle",
    temperature: 60,
    targetTemperature: 180,
    timeRemaining: null,
    timeTotal: null,
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
      { id: "coffee_activate", label: "Activate Machine", tone: "primary" },
      { id: "coffee_select_espresso", label: "Brew Espresso" },
      { id: "coffee_select_lungo", label: "Brew Lungo" },
      { id: "coffee_cancel", label: "Cancel Brew" },
      { id: "coffee_capsule_empty", label: "Set Capsule Empty", tone: "danger" },
      { id: "coffee_capsule_load", label: "Load Capsule" },
    ],
  },
  {
    id: "oven",
    title: "Oven",
    actions: [
      { id: "oven_preheat", label: "Preheat", tone: "primary" },
      { id: "oven_start_heat", label: "Start Heating", tone: "primary" },
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
  coffee_activate: {
    message: "Coffee machine activated",
    detection: { gesture: "Manual: Activate Coffee" },
  },
  coffee_select_espresso: {
    message: "Espresso brewing started",
    detection: { gesture: "Manual: Brew Espresso" },
  },
  coffee_select_lungo: {
    message: "Lungo brewing started",
    detection: { gesture: "Manual: Brew Lungo" },
  },
  coffee_cancel: {
    message: "Coffee brewing cancelled",
    detection: { gesture: "Manual: Cancel Coffee" },
  },
  coffee_capsule_empty: {
    message: "Coffee capsule marked empty",
    detection: { gesture: "Manual: Capsule Empty" },
  },
  coffee_capsule_load: {
    message: "Coffee capsule loaded",
    detection: { gesture: "Manual: Capsule Loaded" },
  },
  oven_preheat: {
    message: "Oven preheating",
    detection: { gesture: "Manual: Preheat Oven" },
  },
  oven_start_heat: {
    message: "Oven heating started",
    detection: { gesture: "Manual: Start Oven" },
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
