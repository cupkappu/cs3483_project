import { useMemo, useRef, type ChangeEvent } from "react";
import { gestureOptions } from "../gestureSignals";
import type { GestureSignal } from "../gestureSignals";
import type { CaptureStatus, RecordedSample } from "../types";

interface GestureRecorderProps {
  selectedLabel: GestureSignal;
  isRecording: boolean;
  frameCount: number;
  samples: RecordedSample[];
  captureStatus: CaptureStatus;
  lastConfidence: number | null;
  onSelectLabel: (label: GestureSignal) => void;
  onStartCapture: () => void;
  onStopCapture: () => void;
  onRemoveSample: (sampleId: string) => void;
  onClearSamples: () => void;
  onExportSamples: () => void;
  onImportSamples: (samples: RecordedSample[]) => void;
}

const STATUS_LABEL: Record<CaptureStatus, string> = {
  idle: "Not initialized",
  "camera-initializing": "Camera initializing",
  "model-loading": "Model loading",
  ready: "Ready",
  error: "Error",
};

export function GestureRecorder({
  selectedLabel,
  isRecording,
  frameCount,
  samples,
  captureStatus,
  lastConfidence,
  onSelectLabel,
  onStartCapture,
  onStopCapture,
  onRemoveSample,
  onClearSamples,
  onExportSamples,
  onImportSamples,
}: GestureRecorderProps) {
  const isReady = captureStatus === "ready";
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const createImportedId = () => `imported-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;

  const statusText = useMemo(() => {
    if (isRecording) {
      return "Recording";
    }
    return STATUS_LABEL[captureStatus] ?? "Unknown";
  }, [captureStatus, isRecording]);

  const confidenceText = useMemo(() => {
    if (lastConfidence == null) return "-";
    return `${Math.round(lastConfidence * 100)}%`;
  }, [lastConfidence]);

  const handleSelectChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onSelectLabel(event.target.value as GestureSignal);
  };

  const sortedSamples = useMemo(
    () => samples.slice().sort((a, b) => b.createdAt - a.createdAt),
    [samples]
  );

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      const rawSamples: unknown = Array.isArray(payload) ? payload : payload?.samples;
      if (!Array.isArray(rawSamples) || !rawSamples.length) {
  window.alert?.("Import failed: no valid samples found in the file.");
        return;
      }

      const imported: RecordedSample[] = rawSamples
        .map((raw: any): RecordedSample | null => {
          if (!raw) return null;
          const label = raw.label;
          const frames = Array.isArray(raw.frames) ? raw.frames : [];
          if (!label || !frames.length) return null;

          const createdAtValue =
            typeof raw.createdAt === "string"
              ? Date.parse(raw.createdAt)
              : typeof raw.createdAt === "number"
                ? raw.createdAt
                : Date.now();
          const createdAt = Number.isFinite(createdAtValue) ? createdAtValue : Date.now();

          return {
            id: typeof raw.id === "string" ? raw.id : createImportedId(),
            label,
            createdAt,
            frames,
          } satisfies RecordedSample;
        })
        .filter((sample): sample is RecordedSample => Boolean(sample));

      if (!imported.length) {
        window.alert?.("Import failed: no valid samples detected.");
        return;
      }

      onImportSamples(imported);
      window.alert?.(`Successfully imported ${imported.length} sample${imported.length === 1 ? "" : "s"}.`);
    } catch (error) {
      console.error("Failed to import samples", error);
      window.alert?.("Sample import failed. Please verify the file format.");
    }
  };

  return (
    <div className="panel">
      <header className="control-row">
        <h2>Gesture Capture</h2>
        <span className="status-tag" data-state={isRecording ? "recording" : captureStatus}>
          {statusText}
        </span>
      </header>

      <p>Select the target gesture and start recording in sync. Only begin sampling once the model is ready—you can stop anytime and review the captured data.</p>

      <div className="control-row">
        <label htmlFor="gesture-select">Target gesture</label>
        <select id="gesture-select" value={selectedLabel} onChange={handleSelectChange}>
          {gestureOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <button type="button" onClick={onStartCapture} disabled={isRecording || !isReady}>
          Start Recording
        </button>
        <button type="button" onClick={onStopCapture} disabled={!isRecording}>
          Stop & Save
        </button>
        <button type="button" onClick={onClearSamples} disabled={!samples.length}>
          Clear Samples
        </button>
      </div>

      <div className="info-grid">
        <div className="info-card">
          <span className="info-label">Capture Status</span>
          <strong>{statusText}</strong>
        </div>
        <div className="info-card">
          <span className="info-label">Current Gesture</span>
          <strong>{isRecording ? selectedLabel : "Idle"}</strong>
        </div>
        <div className="info-card">
          <span className="info-label">Frame Count</span>
          <strong>{frameCount}</strong>
        </div>
        <div className="info-card">
          <span className="info-label">Latest Confidence</span>
          <strong>{confidenceText}</strong>
        </div>
      </div>

      <div className="sample-section">
        <div className="sample-section-header">
          <h3>Sample List</h3>
          <span className="sample-count">Total {samples.length}</span>
          <div className="sample-actions">
            <button type="button" onClick={onExportSamples} disabled={!samples.length}>
              Export JSON
            </button>
            <button type="button" onClick={handleImportClick}>
              Import JSON
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              hidden
              onChange={handleImportChange}
            />
          </div>
        </div>

        {sortedSamples.length ? (
          <ul className="sample-list">
            {sortedSamples.map((sample) => (
              <li key={sample.id} className="sample-item">
                <div className="sample-main">
                  <span className="sample-label">{sample.label}</span>
                  <time dateTime={new Date(sample.createdAt).toISOString()}>
                    {new Date(sample.createdAt).toLocaleTimeString()}
                  </time>
                </div>
                <div className="sample-meta">
                  <span>{sample.frames.length} frames</span>
                  <button type="button" onClick={() => onRemoveSample(sample.id)}>
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty-hint">No samples yet—wait for the model to be ready, then start recording.</div>
        )}
      </div>
    </div>
  );
}
