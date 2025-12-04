import type { HandFrame, HandPoseDetection } from "../types";

const KEYPOINTS_PER_HAND = 21;
const DIMENSIONS = 3;
const FEATURE_LENGTH = KEYPOINTS_PER_HAND * DIMENSIONS;
const MAX_HANDS = 2;

const ZERO_HAND_VECTOR = new Array(FEATURE_LENGTH).fill(0);

const sanitizeNumber = (value: number | undefined) => {
  if (Number.isFinite(value)) {
    return Number(value);
  }
  return 0;
};

const normaliseHandedness = (hand: HandPoseDetection | undefined): string | undefined => {
  if (!hand?.handedness) return undefined;
  return hand.handedness.toString().trim().toLowerCase();
};

const coerceLegacyFrame = (frame: HandFrame): HandPoseDetection[] => {
  if (frame.hands && frame.hands.length) {
    return frame.hands;
  }

  const legacy = frame as unknown as {
    confidence?: number;
    keypoints?: HandPoseDetection["keypoints"];
    keypoints3D?: HandPoseDetection["keypoints3D"];
  };

  if (!legacy.keypoints3D?.length) {
    return [];
  }

  return [
    {
      confidence: legacy.confidence ?? 0,
      handedness: undefined,
      keypoints: legacy.keypoints ?? [],
      keypoints3D: legacy.keypoints3D ?? [],
    },
  ];
};

const orderHands = (hands: HandPoseDetection[] | undefined): Array<HandPoseDetection | undefined> => {
  if (!hands?.length) {
    return new Array(MAX_HANDS).fill(undefined);
  }

  const slots = new Array<HandPoseDetection | undefined>(MAX_HANDS).fill(undefined);

  const leftIndex = hands.findIndex((hand) => normaliseHandedness(hand) === "left");
  if (leftIndex >= 0) {
    slots[0] = hands[leftIndex];
  }

  const rightIndex = hands.findIndex((hand, idx) => idx !== leftIndex && normaliseHandedness(hand) === "right");
  if (rightIndex >= 0) {
    slots[1] = hands[rightIndex];
  }

  const remaining = hands.filter((_, idx) => idx !== leftIndex && idx !== rightIndex);
  let slotPointer = 0;
  for (const hand of remaining) {
    while (slotPointer < MAX_HANDS && slots[slotPointer]) {
      slotPointer += 1;
    }
    if (slotPointer >= MAX_HANDS) {
      break;
    }
    slots[slotPointer] = hand;
  }

  return slots;
};

/**
 * Convert a list of frames to a single averaged feature vector.
 * Multi-hand samples are flattened into [Left, Right] slots (or detection order fallback).
 */
export function extractFeatureVector(frames: HandFrame[]): number[] | null {
  if (!frames.length) {
    return null;
  }

  const accumulators = Array.from({ length: MAX_HANDS }, () => new Array(FEATURE_LENGTH).fill(0));
  const frameCounts = new Array<number>(MAX_HANDS).fill(0);

  frames.forEach((frame) => {
  const orderedHands = orderHands(coerceLegacyFrame(frame));

    orderedHands.forEach((hand, handIndex) => {
      if (!hand?.keypoints3D?.length) {
        return;
      }
      const wrist = hand.keypoints3D[0];
      if (!wrist) {
        return;
      }

      frameCounts[handIndex] += 1;

      for (let index = 0; index < KEYPOINTS_PER_HAND; index += 1) {
        const point = hand.keypoints3D[index];
        if (!point) {
          continue;
        }

        const relativeX = sanitizeNumber(point.x) - sanitizeNumber(wrist.x);
        const relativeY = sanitizeNumber(point.y) - sanitizeNumber(wrist.y);
        const relativeZ = sanitizeNumber(point.z) - sanitizeNumber(wrist.z);

        const base = index * DIMENSIONS;
        accumulators[handIndex][base] += relativeX;
        accumulators[handIndex][base + 1] += relativeY;
        accumulators[handIndex][base + 2] += relativeZ;
      }
    });
  });

  if (!frameCounts.some((count) => count > 0)) {
    return null;
  }

  const featureVector: number[] = [];

  for (let handIndex = 0; handIndex < MAX_HANDS; handIndex += 1) {
    const count = frameCounts[handIndex];
    if (!count) {
      featureVector.push(...ZERO_HAND_VECTOR);
      continue;
    }

    const averaged = accumulators[handIndex].map((value, coordIndex) => {
      const average = value / count;
      if (!Number.isFinite(average)) {
        return ZERO_HAND_VECTOR[coordIndex];
      }
      return Number(average.toFixed(6));
    });

    featureVector.push(...averaged);
  }

  return featureVector;
}
