import type { GestureSignal } from "./gestureSignals";

export type CaptureStatus =
  | "idle"
  | "camera-initializing"
  | "model-loading"
  | "ready"
  | "error";

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

export interface RecordedSample {
  id: string;
  label: GestureSignal;
  createdAt: number;
  frames: HandFrame[];
}
