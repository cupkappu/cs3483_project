import { useCallback, useMemo, useRef, useState } from "react";
import * as tf from "@tensorflow/tfjs";
import { create, type KNNClassifier } from "@tensorflow-models/knn-classifier";
import type { RecordedSample } from "../types";
import { extractFeatureVector } from "../utils/featureExtraction";

interface TrainingPanelProps {
  samples: RecordedSample[];
}

interface TrainingSummary {
  total: number;
  trained: number;
  evaluationType: "holdout" | "training";
  perLabel: Record<string, { total: number; correct: number }>;
  accuracy: number;
}

type TrainerState = "idle" | "training" | "trained" | "error";

export function TrainingPanel({ samples }: TrainingPanelProps) {
  const classifierRef = useRef<KNNClassifier | null>(null);
  const featureSizeRef = useRef<number | null>(null);
  const [trainerState, setTrainerState] = useState<TrainerState>("idle");
  const [summary, setSummary] = useState<TrainingSummary | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const datasetStats = useMemo(() => {
    const stats = new Map<string, { count: number; frames: number }>();
    samples.forEach((sample) => {
      const info = stats.get(sample.label) ?? { count: 0, frames: 0 };
      info.count += 1;
      info.frames += sample.frames.length;
      stats.set(sample.label, info);
    });
    return Array.from(stats.entries()).map(([label, info]) => ({
      label,
      ...info,
    }));
  }, [samples]);

  const datasetSize = useMemo(() => datasetStats.reduce((acc, item) => acc + item.count, 0), [datasetStats]);

  const handleTrain = useCallback(async () => {
    setTrainerState("training");
    setErrorMessage(null);
    setSummary(null);

    try {
      await tf.ready();
      if (classifierRef.current) {
        classifierRef.current.dispose();
      }

      const featureRecords: Array<{ feature: number[]; label: string }> = [];

      samples.forEach((sample) => {
        const feature = extractFeatureVector(sample.frames);
        if (!feature) {
          return;
        }
        featureRecords.push({ feature, label: sample.label });
      });

      if (!featureRecords.length) {
        throw new Error("没有可用的样本或关键点数据不完整");
      }

      for (let i = featureRecords.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [featureRecords[i], featureRecords[j]] = [featureRecords[j], featureRecords[i]];
      }

      const holdoutSize = featureRecords.length >= 5 ? Math.max(1, Math.floor(featureRecords.length * 0.2)) : 0;
      const testRecords = holdoutSize ? featureRecords.slice(0, holdoutSize) : [];
      const trainRecords = holdoutSize ? featureRecords.slice(holdoutSize) : featureRecords.slice();

      const classifier = create();
      classifierRef.current = classifier;
      featureSizeRef.current = trainRecords[0]?.feature.length ?? null;

      trainRecords.forEach(({ feature, label }) => {
        const tensor = tf.tensor2d([feature]);
        classifier.addExample(tensor, label);
        tensor.dispose();
      });

      const perLabel: TrainingSummary["perLabel"] = {};
      let correct = 0;

      const evaluationRecords = testRecords.length ? testRecords : trainRecords;
      const evaluationType: TrainingSummary["evaluationType"] = testRecords.length ? "holdout" : "training";

      for (const { feature, label } of evaluationRecords) {
        const tensor = tf.tensor2d([feature]);
        const result = await classifier.predictClass(tensor, Math.min(3, Math.max(1, trainRecords.length)));
        tensor.dispose();

        perLabel[label] ??= { total: 0, correct: 0 };
        perLabel[label].total += 1;

        if (result?.label === label) {
          perLabel[label].correct += 1;
          correct += 1;
        }
      }

      const accuracy = evaluationRecords.length ? correct / evaluationRecords.length : 0;

      setSummary({
        total: evaluationRecords.length,
        trained: trainRecords.length,
        evaluationType,
        perLabel,
        accuracy,
      });
      setTrainerState("trained");
    } catch (error) {
      console.error("训练失败", error);
      setErrorMessage(error instanceof Error ? error.message : String(error));
      setTrainerState("error");
    }
  }, [samples]);

  const handleReset = useCallback(() => {
    if (classifierRef.current) {
      classifierRef.current.dispose();
      classifierRef.current = null;
    }
    setTrainerState("idle");
    setSummary(null);
    setErrorMessage(null);
  }, []);

  const handleExportModel = useCallback(() => {
    if (!classifierRef.current) {
      window.alert?.("请先训练再导出模型");
      return;
    }
    try {
      const dataset = classifierRef.current.getClassifierDataset();
      const serialized = Object.fromEntries(
        Object.entries(dataset).map(([label, tensor]) => [
          label,
          {
            data: Array.from(tensor.dataSync()),
            shape: tensor.shape,
          },
        ])
      );

      const payload = {
        exportedAt: new Date().toISOString(),
        featureSize: featureSizeRef.current,
        classExampleCount: classifierRef.current.getClassExampleCount(),
        dataset: serialized,
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `gesture-knn-${Date.now()}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("导出模型失败", error);
      window.alert?.("导出模型失败，请查看控制台错误");
    }
  }, []);

  const hasSamples = datasetSize > 0;

  return (
    <section className="training-panel">
      <header className="training-header">
        <div>
          <h2>浏览器内训练</h2>
          <p>
            使用 TensorFlow.js 的 KNN 分类器在浏览器端训练模型。训练数据来自上方采集的样本，会将 keypoints3D 均值化后作为
            特征向量。
          </p>
        </div>
        <div className="training-actions">
          <button type="button" onClick={handleTrain} disabled={!hasSamples || trainerState === "training"}>
            {trainerState === "training" ? "训练中..." : "开始训练"}
          </button>
          <button type="button" onClick={handleExportModel} disabled={!summary}>
            导出模型
          </button>
          <button type="button" onClick={handleReset}>
            重置
          </button>
        </div>
      </header>

      <div className="training-stats">
        <div className="info-card">
          <span className="info-label">训练状态</span>
          <strong>
            {trainerState === "idle" && "待开始"}
            {trainerState === "training" && "训练中"}
            {trainerState === "trained" && "训练完成"}
            {trainerState === "error" && "发生错误"}
          </strong>
        </div>
        <div className="info-card">
          <span className="info-label">样本总数</span>
          <strong>{datasetSize}</strong>
        </div>
        <div className="info-card">
          <span className="info-label">标签数量</span>
          <strong>{datasetStats.length}</strong>
        </div>
        {summary && (
          <>
            <div className="info-card">
              <span className="info-label">训练样本</span>
              <strong>{summary.trained}</strong>
            </div>
            <div className="info-card">
              <span className="info-label">评估集</span>
              <strong>
                {summary.evaluationType === "holdout" ? `保留集 (${summary.total})` : `训练集 (${summary.total})`}
              </strong>
            </div>
            <div className="info-card">
              <span className="info-label">整体准确率</span>
              <strong>{Math.round(summary.accuracy * 100)}%</strong>
            </div>
          </>
        )}
      </div>

      <div className="training-dataset">
        <h3>数据集分布</h3>
        {datasetStats.length ? (
          <ul>
            {datasetStats.map((item) => (
              <li key={item.label}>
                <span>{item.label}</span>
                <span>{item.count} 条样本 / {item.frames} 帧</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty-hint">暂无样本，先采集数据再开始训练。</div>
        )}
      </div>

      {summary && (
        <div className="training-results">
          <h3>训练结果</h3>
          <ul>
            {Object.entries(summary.perLabel).map(([label, info]) => (
              <li key={label}>
                <span>{label}</span>
                <span>
                  {info.correct} / {info.total} 正确 ({Math.round((info.correct / info.total) * 100)}%)
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {errorMessage && <p className="error-text">{errorMessage}</p>}
    </section>
  );
}
