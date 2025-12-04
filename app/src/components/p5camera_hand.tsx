import Sketch from "react-p5";
import p5Types from "p5";
import { useCallback, useEffect, useRef } from "react";
import * as tf from "@tensorflow/tfjs";
import type { Tensor, Tensor2D } from "@tensorflow/tfjs-core";
import { create, type KNNClassifier } from "@tensorflow-models/knn-classifier";
import { GestureSignal, type GestureSignalHandler, type HandFrame, type HandKeypoint, type HandPoseDetection } from "../types";
import { extractFeatureVector } from "../utils/featureExtraction";

const MODEL_URL = new URL("../assets/gesture-knn-1764860392550.json", import.meta.url).href;
const MAX_HANDS = 2;
const FRAME_INTERVAL = 6;
const MIN_PREDICTION_CONFIDENCE = 0.6;
const GESTURE_COOLDOWN_MS = 1200;

type SerializedTensor = {
  data: number[];
  shape: number[];
};

interface SerializedKnnModel {
  exportedAt: string;
  featureSize?: number | null;
  classExampleCount: Record<string, number>;
  dataset: Record<string, SerializedTensor>;
}

const ensureKeypoints = (points: any[] | undefined): HandKeypoint[] => {
  if (!points || !Array.isArray(points)) {
    return [];
  }
  return points.map((point) => ({
    x: Number(point?.x) || 0,
    y: Number(point?.y) || 0,
    z: typeof point?.z === "number" ? point.z : undefined,
    name: typeof point?.name === "string" ? point.name : undefined,
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

const isKnownGesture = (label: string): label is GestureSignal => {
  return Object.values(GestureSignal).includes(label as GestureSignal);
};

export default function P5camera_hand({
  canvas_size: { width, height },
  gesture_callback,
  confidence_callback,
}: {
  canvas_size: { width: number; height: number };
  gesture_callback: GestureSignalHandler;
  confidence_callback: (confidence: number) => void;
}) {
  const handPoseRef = useRef<any>(null);
  const videoRef = useRef<p5Types.Element | null>(null);
  const detectionsRef = useRef<any[]>([]);
  const lastGestureRef = useRef<GestureSignal>(GestureSignal.None);
  const frameCounterRef = useRef(0);
  const classifierRef = useRef<KNNClassifier | null>(null);
  const featureSizeRef = useRef<number | null>(null);
  const datasetTensorsRef = useRef<tf.Tensor[]>([]);
  const predictionInFlightRef = useRef(false);
  const lastGestureTimeRef = useRef<number>(0);
  const pendingNoneRef = useRef(false);

  const loadClassifier = useCallback(async () => {
    if (classifierRef.current) {
      return classifierRef.current;
    }

    await tf.ready();
    const response = await fetch(MODEL_URL);
    if (!response.ok) {
      throw new Error(`无法加载手势模型: ${response.status}`);
    }

    const payload = (await response.json()) as SerializedKnnModel;
    if (!payload?.dataset) {
      throw new Error("手势模型格式不正确");
    }

  const classifier = create();
  const tensors: tf.Tensor[] = [];

    const datasetEntries = Object.entries(payload.dataset).map(([label, value]) => {
      const tensor = tf.tensor2d(value.data, value.shape as [number, number]);
      tensors.push(tensor);
      return [label, tensor] as const;
    });

    const dataset = Object.fromEntries(datasetEntries) as Record<string, tf.Tensor2D>;
    classifier.setClassifierDataset(dataset as unknown as { [label: string]: Tensor2D });
    classifierRef.current = classifier;
    datasetTensorsRef.current = tensors;
    featureSizeRef.current = typeof payload.featureSize === "number" ? payload.featureSize : datasetEntries[0]?.[1].shape?.[0] ?? null;

    return classifier;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadClassifier();
      } catch (error) {
        if (!cancelled) {
          console.error("加载手势识别模型失败", error);
        }
      }
    })();

    return () => {
      cancelled = true;
      try {
        handPoseRef.current?.detectStop?.();
      } catch (error) {
        console.warn("停止手势检测失败", error);
      }
      classifierRef.current?.dispose();
      classifierRef.current = null;
      datasetTensorsRef.current.forEach((tensor) => tensor.dispose());
      datasetTensorsRef.current = [];
      videoRef.current?.remove?.();
      videoRef.current = null;
    };
  }, [loadClassifier]);

  const setup = useCallback(
    (p5: p5Types, canvasParentRef: Element) => {
      const renderer = p5.createCanvas(width, height);
      renderer.parent(canvasParentRef);

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

      const initialiseHandPose = async () => {
        try {
          const ml5 = (window as any).ml5;
          if (!ml5?.handPose) {
            throw new Error("ml5.handPose 未找到");
          }
          const model = await ml5.handPose({ maxHands: MAX_HANDS, flipped: true });
          handPoseRef.current = model;
          model.detectStart(video.elt, (results: any[]) => {
            detectionsRef.current = results ?? [];
          });
        } catch (error) {
          console.error("初始化手势检测失败", error);
        }
      };

      const element = video.elt as HTMLVideoElement;
      if (element.readyState >= 2) {
        void initialiseHandPose();
      } else {
        element.onloadeddata = () => {
          void initialiseHandPose();
        };
      }
    },
    [height, width]
  );

  const draw = useCallback(
    (p5: p5Types) => {
      const video = videoRef.current;
      if (!video) {
        return;
      }

      p5.push();
      p5.translate(width, 0);
      p5.scale(-1, 1);
      p5.image(video, 0, 0, width, height);
      p5.pop();

      if (!detectionsRef.current.length) {
        if (lastGestureRef.current !== GestureSignal.None) {
          gesture_callback(GestureSignal.None);
          lastGestureRef.current = GestureSignal.None;
        }
        pendingNoneRef.current = false;
        if (frameCounterRef.current % FRAME_INTERVAL === 0) {
          confidence_callback(0);
        }
        frameCounterRef.current += 1;
        return;
      }

      const hands = mapDetectionsToHands(detectionsRef.current);

      p5.push();
      const colors = [
        { stroke: [96, 185, 255] as [number, number, number] },
        { stroke: [255, 153, 204] as [number, number, number] },
      ];
      hands.forEach((hand, index) => {
        const color = colors[index % colors.length];
        p5.noFill();
        p5.stroke(...color.stroke);
        p5.strokeWeight(2);
        hand.keypoints.forEach((point) => {
          const { x, y } = point;
          const mirroredX = width - x;
          p5.circle(mirroredX, y, 6);
        });
      });
      p5.pop();

      frameCounterRef.current += 1;
      if (frameCounterRef.current % FRAME_INTERVAL !== 0) {
        return;
      }

      const frame: HandFrame = {
        timestamp: Date.now(),
        hands,
      };
      const feature = extractFeatureVector([frame]);
      if (!feature?.length) {
        confidence_callback(0);
        return;
      }

      if (featureSizeRef.current && feature.length !== featureSizeRef.current) {
        console.warn("特征长度与模型不匹配", feature.length, featureSizeRef.current);
        return;
      }

      const classifier = classifierRef.current;
      if (!classifier || predictionInFlightRef.current) {
        return;
      }

      predictionInFlightRef.current = true;
      const tensor = tf.tensor2d([feature]);
      classifier
        .predictClass(tensor as unknown as Tensor)
        .then((prediction) => {
          const confidences = prediction?.confidences ?? {};
          const topConfidence = prediction?.label ? confidences[prediction.label] ?? 0 : 0;
          const normalizedConfidence = topConfidence ?? 0;
          confidence_callback(normalizedConfidence);

          const now = Date.now();
          const isConfidentPrediction =
            Boolean(prediction?.label) && normalizedConfidence >= MIN_PREDICTION_CONFIDENCE && isKnownGesture(prediction.label);

          if (isConfidentPrediction) {
            const label = prediction.label as GestureSignal;
            const cooldownElapsed = now - lastGestureTimeRef.current >= GESTURE_COOLDOWN_MS;
            const readyForNextGesture = cooldownElapsed && !pendingNoneRef.current;

            if (readyForNextGesture) {
              if (label !== lastGestureRef.current) {
                gesture_callback(label);
                lastGestureRef.current = label;
              }
              lastGestureTimeRef.current = now;
              pendingNoneRef.current = true;
            }
            return;
          }

          if (pendingNoneRef.current && lastGestureRef.current !== GestureSignal.None) {
            gesture_callback(GestureSignal.None);
            lastGestureRef.current = GestureSignal.None;
            pendingNoneRef.current = false;
          }
        })
        .catch((error) => {
          console.error("手势识别失败", error);
        })
        .finally(() => {
          predictionInFlightRef.current = false;
          tensor.dispose();
        });
    },
    [confidence_callback, gesture_callback, height, width]
  );

  return <Sketch setup={setup} draw={draw} />;
}
