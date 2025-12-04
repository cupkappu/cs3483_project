import type { LogSummaryItem, LogTimelineItem } from "../types";
import "../styles/log-board.css";

interface LogBoardProps {
  total: number;
  summaryItems: LogSummaryItem[];
  timelineItems: LogTimelineItem[];
  onExport: () => void;
  onClear: () => void;
}

export default function LogBoard({
  total,
  summaryItems,
  timelineItems,
  onExport,
  onClear,
}: LogBoardProps) {
  return (
    <div className="log-layout">
      <section className="log-column log-column--summary">
        <h1>Summary</h1>
        <div className="log-summary-body">
          <div className="log-count">Today: {total}</div>
          {summaryItems.length > 0 ? (
            <ul>
              {summaryItems.map((item) => (
                <li key={item.id}>
                  <span>{item.label}:</span>
                  <span>{item.value}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="log-empty">No activity yet.</p>
          )}
        </div>
      </section>

      <section className="log-column log-column--timeline">
        <h2>Timeline</h2>
        {timelineItems.length > 0 ? (
          <ul>
            {timelineItems.map((item) => (
              <li
                key={item.id}
                className={item.variant === "alert" ? "log-alert" : undefined}
              >
                <span className="log-time">{item.time}</span>
                <span className="log-event">{item.text}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="log-empty">No recorded actions yet.</div>
        )}
      </section>

      <aside className="log-column log-column--actions" aria-label="Log actions">
        <button
          type="button"
          className="log-button log-button--primary"
          onClick={onExport}
        >
          Export Log
        </button>
        <button type="button" className="log-button" onClick={onClear}>
          Clear Log
        </button>
      </aside>
    </div>
  );
}
