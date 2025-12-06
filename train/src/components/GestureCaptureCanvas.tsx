import { useCallback, useEffect, useMemo, useRef } from "react";
import Sketch from "react-p5";
import type p5Types from "p5";
import type { CaptureStatus, HandFrame, HandKeypoint, HandPoseDetection } from "../types";

interface GestureCaptureCanvasProps {
  width?: number;
  height?: number;
  isRecording: boolean;
  onFrame: (frame: HandFrame) => void;
  onStatusChange?: (status: CaptureStatus) => void;
}

const DEFAULT_SIZE = { width: 640, height: 360 };
const ML5_POLL_INTERVAL = 250;
const ML5_POLL_RETRIES = 40;
const MAX_HANDS = 2;

const ensureKeypoints = (points: any[] | undefined): HandKeypoint[] => {
  if (!points || !Array.isArray(points)) {
    return [];
  }
  return points.map((point) => ({
    x: Number(point.x) || 0,
    y: Number(point.y) || 0,
    z: typeof point.z === "number" ? point.z : undefined,
    name: typeof point.name === "string" ? point.name : undefined,
  }));
};

const extractHandedness = (detection: any, fallbackIndex: number): string | undefined => {
  const raw = detection?.handedness ?? detection?.label ?? detection?.annotations?.handedness;
  if (typeof raw === "string") {
    return raw;
  }
  if (Array.isArray(raw) && typeof raw[0] === "string") {
    return raw[0];
  }
  return fallbackIndex === 0 ? "Unknown-0" : fallbackIndex === 1 ? "Unknown-1" : undefined;
};

const mapDetectionsToHands = (detections: any[]): HandPoseDetection[] => {
  return detections.slice(0, MAX_HANDS).map((detection, index) => ({
    confidence: Number(detection?.confidence ?? detection?.handInViewConfidence ?? 0),
    handedness: extractHandedness(detection, index),
    keypoints: ensureKeypoints(detection?.keypoints),
    keypoints3D: ensureKeypoints(detection?.keypoints3D),
  }));
};

export default function GestureCaptureCanvas({
  width = DEFAULT_SIZE.width,
  height = DEFAULT_SIZE.height,
  isRecording,
  onFrame,
  onStatusChange,
}: GestureCaptureCanvasProps) {
  const canvasRef = useRef<p5Types.Renderer | null>(null);
  const videoRef = useRef<p5Types.Element | null>(null);
  const handPoseRef = useRef<any>(null);
  const detectionsRef = useRef<any[]>([]);
  const lastEmitRef = useRef<number>(0);
  const statusRef = useRef<CaptureStatus>("idle");
  const onFrameRef = useRef(onFrame);
  const onStatusChangeRef = useRef(onStatusChange);

  onFrameRef.current = onFrame;
  onStatusChangeRef.current = onStatusChange;

  const updateStatus = useCallback((next: CaptureStatus) => {
    if (statusRef.current === next) return;
    statusRef.current = next;
    onStatusChangeRef.current?.(next);
  }, []);

  const waitForMl5 = useCallback(async () => {
    const attemptResolve = (): any | null => (window as any).ml5 ?? null;
    const resolved = attemptResolve();
    if (resolved) {
      return resolved;
    }

    return await new Promise<any>((resolve, reject) => {
      let attempts = 0;
      const timer = setInterval(() => {
        const instance = attemptResolve();
        if (instance) {
          clearInterval(timer);
          resolve(instance);
          return;
        }
        attempts += 1;
        if (attempts >= ML5_POLL_RETRIES) {
          clearInterval(timer);
          reject(new Error("ml5 failed to load within the expected time"));
        }
      }, ML5_POLL_INTERVAL);
    });
  }, []);

  const setup = useCallback(
    (p5: p5Types, canvasParentRef: Element) => {
      updateStatus("camera-initializing");
      const renderer = p5.createCanvas(width, height);
      renderer.parent(canvasParentRef);
      renderer.addClass("canvas-frame");
      canvasRef.current = renderer;

      const video = p5.createCapture({
        video: {
          facingMode: "user",
          width,
          height,
        },
        audio: false,
      });
      video.size(width, height);
      video.hide();
      videoRef.current = video;

      const initializeModel = async () => {
        try {
          updateStatus("model-loading");
          const ml5 = await waitForMl5();
          if (!ml5?.handPose) {
            throw new Error("ml5.handPose was not found");
          }

          const model = await ml5.handPose({ maxHands: MAX_HANDS, flipped: true });
          handPoseRef.current = model;
          model.detectStart(video.elt, (results: any[]) => {
            detectionsRef.current = results ?? [];
          });
          updateStatus("ready");
        } catch (error) {
          console.error("Failed to initialize the hand-pose model", error);
          updateStatus("error");
        }
      };

      const element = video.elt as HTMLVideoElement;
      if (element.readyState >= 2) {
        void initializeModel();
      } else {
        element.onloadeddata = () => {
          void initializeModel();
        };
      }
    },
    [height, updateStatus, waitForMl5, width]
  );

  const draw = useCallback(
    (p5: p5Types) => {
      const video = videoRef.current;
      if (!video) return;

      p5.push();
      p5.translate(width, 0);
      p5.scale(-1, 1);
      p5.image(video, 0, 0, width, height);
      p5.pop();

      if (!detectionsRef.current.length) {
        return;
      }

      const colors = [
        { stroke: [96, 185, 255] as [number, number, number], fill: [96, 185, 255, 120] as [number, number, number, number] },
        { stroke: [255, 153, 204] as [number, number, number], fill: [255, 153, 204, 120] as [number, number, number, number] },
      ];

      const hands = mapDetectionsToHands(detectionsRef.current);

      hands.forEach((hand, index) => {
        const color = colors[index % colors.length];
        p5.push();
        p5.noFill();
        p5.stroke(...color.stroke);
        p5.strokeWeight(2);
        hand.keypoints.forEach(({ x, y }) => {
          const mirroredX = width - x;
          p5.circle(mirroredX, y, 6);
        });
        p5.pop();
      });

      const now = performance.now();
      if (now - lastEmitRef.current < 33) {
        return;
      }
      lastEmitRef.current = now;

      const frame: HandFrame = {
        timestamp: Date.now(),
        hands,
      };
      onFrameRef.current(frame);
    },
    [height, onFrameRef, width]
  );

  useEffect(() => {
    const canvasElement = canvasRef.current?.elt as HTMLCanvasElement | undefined;
    if (!canvasElement) return;
    canvasElement.classList.toggle("is-recording", isRecording);
  }, [isRecording]);

  useEffect(() => {
    return () => {
      try {
        handPoseRef.current?.detectStop?.();
      } catch (error) {
  console.warn("Failed to stop HandPose detection", error);
      }
      if (videoRef.current) {
        try {
          videoRef.current.remove();
        } catch (error) {
          console.warn("Failed to remove the video stream", error);
        }
      }
      canvasRef.current = null;
      videoRef.current = null;
      detectionsRef.current = [];
    };
  }, []);

  const memoizedSketch = useMemo(
    () => <Sketch setup={setup} draw={draw} />, // eslint-disable-line react/jsx-no-bind
    [draw, setup]
  );

  return <div className="canvas-wrapper">{memoizedSketch}</div>;
}
