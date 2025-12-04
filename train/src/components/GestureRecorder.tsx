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
  idle: "未初始化",
  "camera-initializing": "相机初始化中",
  "model-loading": "模型加载中",
  ready: "就绪",
  error: "出现异常",
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
      return "录制中";
    }
    return STATUS_LABEL[captureStatus] ?? "未知";
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
        window.alert?.("导入失败：文件中没有有效的 samples 数据");
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
        window.alert?.("导入失败：未能识别任何有效样本");
        return;
      }

      onImportSamples(imported);
      window.alert?.(`成功导入 ${imported.length} 条样本`);
    } catch (error) {
      console.error("导入样本失败", error);
      window.alert?.("导入样本失败，请确认文件格式无误");
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

      <p>选择目标手势并同步触发录制。模型就绪后再开始采样，可随时停止并回顾样本。</p>

      <div className="control-row">
        <label htmlFor="gesture-select">采集手势</label>
        <select id="gesture-select" value={selectedLabel} onChange={handleSelectChange}>
          {gestureOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <button type="button" onClick={onStartCapture} disabled={isRecording || !isReady}>
          开始录制
        </button>
        <button type="button" onClick={onStopCapture} disabled={!isRecording}>
          停止并保存
        </button>
        <button type="button" onClick={onClearSamples} disabled={!samples.length}>
          清空样本
        </button>
      </div>

      <div className="info-grid">
        <div className="info-card">
          <span className="info-label">捕捉状态</span>
          <strong>{statusText}</strong>
        </div>
        <div className="info-card">
          <span className="info-label">当前手势</span>
          <strong>{isRecording ? selectedLabel : "未录制"}</strong>
        </div>
        <div className="info-card">
          <span className="info-label">帧计数</span>
          <strong>{frameCount}</strong>
        </div>
        <div className="info-card">
          <span className="info-label">最新置信度</span>
          <strong>{confidenceText}</strong>
        </div>
      </div>

      <div className="sample-section">
        <div className="sample-section-header">
          <h3>样本列表</h3>
          <span className="sample-count">共 {samples.length} 条</span>
          <div className="sample-actions">
            <button type="button" onClick={onExportSamples} disabled={!samples.length}>
              导出 JSON
            </button>
            <button type="button" onClick={handleImportClick}>
              导入 JSON
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
                  <span>{sample.frames.length} 帧</span>
                  <button type="button" onClick={() => onRemoveSample(sample.id)}>
                    删除
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty-hint">目前还没有样本，等待模型就绪后开始录制吧。</div>
        )}
      </div>
    </div>
  );
}
