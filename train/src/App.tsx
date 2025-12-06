import { useCallback, useMemo, useRef, useState } from "react";
import "./App.css";
import GestureCaptureCanvas from "./components/GestureCaptureCanvas";
import { GestureRecorder } from "./components/GestureRecorder";
import { TrainingPanel } from "./components/TrainingPanel";
import { GestureSignal } from "./gestureSignals";
import type { CaptureStatus, HandFrame, RecordedSample } from "./types";

const makeSampleId = () => `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;

export default function App() {
  const [selectedLabel, setSelectedLabel] = useState<GestureSignal>(GestureSignal.UpwardWave);
  const [isRecording, setIsRecording] = useState(false);
  const [frameCount, setFrameCount] = useState(0);
  const [captureStatus, setCaptureStatus] = useState<CaptureStatus>("idle");
  const [samples, setSamples] = useState<RecordedSample[]>([]);
  const [lastConfidence, setLastConfidence] = useState<number | null>(null);
  const frameBufferRef = useRef<HandFrame[]>([]);

  const handleStartCapture = useCallback(() => {
    if (captureStatus !== "ready") {
      return;
    }
    frameBufferRef.current = [];
    setFrameCount(0);
    setLastConfidence(null);
    setIsRecording(true);
  }, [captureStatus]);

  const handleStopCapture = useCallback(() => {
    if (!isRecording) {
      return;
    }
    const frames = frameBufferRef.current.map((frame) => ({
      timestamp: frame.timestamp,
      hands: frame.hands.map((hand) => ({
        confidence: hand.confidence,
        handedness: hand.handedness,
        keypoints: hand.keypoints.map((point) => ({ ...point })),
        keypoints3D: hand.keypoints3D.map((point) => ({ ...point })),
      })),
    }));

    frameBufferRef.current = [];
    setIsRecording(false);
    setFrameCount(0);

    if (!frames.length) {
      setLastConfidence(null);
      return;
    }

    const lastHand = frames[frames.length - 1]?.hands?.[0] ?? frames[frames.length - 1]?.hands?.[1];
    setLastConfidence(lastHand?.confidence ?? null);

    const sample: RecordedSample = {
      id: makeSampleId(),
      label: selectedLabel,
      createdAt: Date.now(),
      frames,
    };
    setSamples((prev) => [sample, ...prev]);
  }, [isRecording, selectedLabel]);

  const handleFrameCaptured = useCallback(
    (frame: HandFrame) => {
      if (!isRecording) {
        return;
      }
      frameBufferRef.current.push(frame);
      setFrameCount((count) => count + 1);
      const primaryHand = frame.hands?.[0] ?? frame.hands?.[1];
      setLastConfidence(primaryHand?.confidence ?? null);
    },
    [isRecording]
  );

  const handleCaptureStatusChange = useCallback((status: CaptureStatus) => {
    setCaptureStatus(status);
    if (status !== "ready") {
      frameBufferRef.current = [];
      setIsRecording(false);
      setFrameCount(0);
      setLastConfidence(null);
    }
  }, []);

  const handleRemoveSample = useCallback((sampleId: string) => {
    setSamples((prev) => prev.filter((sample) => sample.id !== sampleId));
  }, []);

  const handleClearSamples = useCallback(() => {
    setSamples([]);
  }, []);

  const handleImportSamples = useCallback((incoming: RecordedSample[]) => {
    if (!incoming.length) {
      return;
    }

    setSamples((prev) => {
      const existingIds = new Set(prev.map((sample) => sample.id));
      const gestureSet = new Set(Object.values(GestureSignal));

      const normalized: RecordedSample[] = [];

      incoming.forEach((sample) => {
        if (!sample || !gestureSet.has(sample.label) || !sample.frames?.length) {
          return;
        }

        let sampleId = typeof sample.id === "string" && sample.id.trim() ? sample.id : makeSampleId();
        while (existingIds.has(sampleId)) {
          sampleId = makeSampleId();
        }

        const createdAt = Number.isFinite(sample.createdAt) ? sample.createdAt : Date.now();

        normalized.push({
          id: sampleId,
          label: sample.label,
          createdAt,
          frames: sample.frames,
        });
        existingIds.add(sampleId);
      });

      if (!normalized.length) {
        return prev;
      }

      return [...normalized, ...prev];
    });
  }, []);

  const handleExportSamples = useCallback(() => {
    if (!samples.length) {
  window.alert?.("No samples available to export");
      return;
    }

    const payload = {
      exportedAt: new Date().toISOString(),
      gestureCount: samples.reduce<Record<string, number>>((acc, sample) => {
        acc[sample.label] = (acc[sample.label] ?? 0) + 1;
        return acc;
      }, {}),
      samples: samples.map((sample) => ({
        id: sample.id,
        label: sample.label,
        createdAt: new Date(sample.createdAt).toISOString(),
        frameCount: sample.frames.length,
        frames: sample.frames,
      })),
    };

    try {
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `gesture-samples-${Date.now()}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } catch (error) {
  console.error("Failed to export samples", error);
  window.alert?.("Export failed. Check the console for details.");
    }
  }, [samples]);

  const recorderProps = useMemo(
    () => ({
      selectedLabel,
      isRecording,
      frameCount,
      samples,
      captureStatus,
      lastConfidence,
      onSelectLabel: setSelectedLabel,
      onStartCapture: handleStartCapture,
      onStopCapture: handleStopCapture,
      onRemoveSample: handleRemoveSample,
      onClearSamples: handleClearSamples,
      onExportSamples: handleExportSamples,
      onImportSamples: handleImportSamples,
    }),
    [
      captureStatus,
      frameCount,
      handleClearSamples,
      handleImportSamples,
      handleExportSamples,
      handleRemoveSample,
      handleStartCapture,
      handleStopCapture,
      isRecording,
      lastConfidence,
      samples,
      selectedLabel,
    ]
  );

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Gesture Trainer Console</h1>
  <p>Capture gesture samples, label them, and export models that plug back into the main console.</p>
      </header>

      <main className="app-content">
        <section className="capture-grid">
          <GestureCaptureCanvas
            isRecording={isRecording}
            onFrame={handleFrameCaptured}
            onStatusChange={handleCaptureStatusChange}
          />
          <GestureRecorder {...recorderProps} />
        </section>

        <TrainingPanel samples={samples} />
      </main>
    </div>
  );
}
