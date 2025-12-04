import { useCallback, useState } from "react";
import P5cameraHand from "./p5camera_hand";

interface LiveCameraFeedProps {
  canvasSize?: { width: number; height: number };
  wrapperClassName?: string;
  frameClassName?: string;
  statusClassName?: string;
  showStatus?: boolean;
  onGestureChange?: (gesture: string) => void;
  onConfidenceChange?: (confidence: number | null) => void;
}

export default function LiveCameraFeed({
  canvasSize = { width: 320, height: 240 },
  wrapperClassName,
  frameClassName,
  statusClassName,
  showStatus = true,
  onGestureChange,
  onConfidenceChange,
}: LiveCameraFeedProps) {
  const [gesture, setGesture] = useState<string>("–");
  const [confidence, setConfidence] = useState<number | null>(null);

  const handleGestureUpdate = useCallback(
    (nextGesture: string) => {
      setGesture((prev) => {
        if (prev === nextGesture) {
          return prev;
        }
        onGestureChange?.(nextGesture);
        return nextGesture;
      });
    },
    [onGestureChange],
  );

  const handleConfidenceUpdate = useCallback(
    (nextConfidence: number) => {
      if (!Number.isFinite(nextConfidence)) {
        return;
      }
      const clamped = Math.max(0, Math.min(1, nextConfidence));
      setConfidence((prev) => {
        if (prev === clamped) {
          return prev;
        }
        onConfidenceChange?.(clamped);
        return clamped;
      });
    },
    [onConfidenceChange],
  );

  const confidenceLabel =
    confidence === null
      ? "–"
      : `${Math.round(Math.max(0, Math.min(100, confidence * 100)))}%`;

  const wrapperClasses = wrapperClassName ? `live-camera-feed ${wrapperClassName}` : "live-camera-feed";
  const frameClasses = frameClassName ?? "camera-frame camera-frame--live";
  const statusClasses = statusClassName ?? "camera-status";

  return (
    <div className={wrapperClasses}>
      <div className={frameClasses}>
        <P5cameraHand
          canvas_size={canvasSize}
          gesture_callback={handleGestureUpdate}
          confidence_callback={handleConfidenceUpdate}
        />
      </div>
      {showStatus && (
        <div className={statusClasses}>
          <span>Gesture: {gesture}</span>
          <span>Confidence: {confidenceLabel}</span>
        </div>
      )}
    </div>
  );
}
