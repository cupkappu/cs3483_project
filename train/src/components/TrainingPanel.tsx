import { useCallback, useMemo, useRef, useState } from "react";
import * as tf from "@tensorflow/tfjs";
import type { Tensor } from "@tensorflow/tfjs-core";
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
        throw new Error("No usable samples or keypoint data found.");
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
  const tensor = tf.tensor2d([feature]) as unknown as Tensor;
        classifier.addExample(tensor, label);
        tensor.dispose();
      });

      const perLabel: TrainingSummary["perLabel"] = {};
      let correct = 0;

      const evaluationRecords = testRecords.length ? testRecords : trainRecords;
      const evaluationType: TrainingSummary["evaluationType"] = testRecords.length ? "holdout" : "training";

      for (const { feature, label } of evaluationRecords) {
  const tensor = tf.tensor2d([feature]) as unknown as Tensor;
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
  console.error("Training failed", error);
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
      window.alert?.("Please train a model before exporting.");
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
      console.error("Failed to export the model", error);
      window.alert?.("Model export failed. Check the console for details.");
    }
  }, []);

  const hasSamples = datasetSize > 0;

  return (
    <section className="training-panel">
      <header className="training-header">
        <div>
          <h2>In-browser Training</h2>
          <p>
            Train the classifier directly in the browser with TensorFlow.js and its KNN classifier. The data comes from the samples above and uses averaged
            keypoints3D values as the feature vector.
          </p>
        </div>
        <div className="training-actions">
          <button type="button" onClick={handleTrain} disabled={!hasSamples || trainerState === "training"}>
            {trainerState === "training" ? "Training..." : "Start Training"}
          </button>
          <button type="button" onClick={handleExportModel} disabled={!summary}>
            Export Model
          </button>
          <button type="button" onClick={handleReset}>
            Reset
          </button>
        </div>
      </header>

      <div className="training-stats">
        <div className="info-card">
          <span className="info-label">Training Status</span>
          <strong>
            {trainerState === "idle" && "Waiting"}
            {trainerState === "training" && "Training"}
            {trainerState === "trained" && "Training Complete"}
            {trainerState === "error" && "Error"}
          </strong>
        </div>
        <div className="info-card">
          <span className="info-label">Total Samples</span>
          <strong>{datasetSize}</strong>
        </div>
        <div className="info-card">
          <span className="info-label">Label Count</span>
          <strong>{datasetStats.length}</strong>
        </div>
        {summary && (
          <>
            <div className="info-card">
              <span className="info-label">Training Samples</span>
              <strong>{summary.trained}</strong>
            </div>
            <div className="info-card">
              <span className="info-label">Evaluation Set</span>
              <strong>
                {summary.evaluationType === "holdout" ? `Holdout (${summary.total})` : `Training (${summary.total})`}
              </strong>
            </div>
            <div className="info-card">
              <span className="info-label">Overall Accuracy</span>
              <strong>{Math.round(summary.accuracy * 100)}%</strong>
            </div>
          </>
        )}
      </div>

      <div className="training-dataset">
        <h3>Dataset Distribution</h3>
        {datasetStats.length ? (
          <ul>
            {datasetStats.map((item) => (
              <li key={item.label}>
                <span>{item.label}</span>
                <span>
                  {item.count} sample{item.count === 1 ? "" : "s"} / {item.frames} frame{item.frames === 1 ? "" : "s"}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty-hint">No samples yet—collect data first, then start training.</div>
        )}
      </div>

      {summary && (
        <div className="training-results">
          <h3>Training Results</h3>
          <ul>
            {Object.entries(summary.perLabel).map(([label, info]) => (
              <li key={label}>
                <span>{label}</span>
                <span>
                  {info.correct} / {info.total} correct ({Math.round((info.correct / info.total) * 100)}%)
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
