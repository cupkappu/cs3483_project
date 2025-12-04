import type { LogEntry, LogSummaryItem, LogTimelineItem } from "../types";

export const formatTimestamp = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "--:--";
  }
  return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
};

export const buildLogSummaryItems = (entries: LogEntry[]): LogSummaryItem[] => {
  const counts = {
    water: 0,
    coffee: 0,
    oven: 0,
    stop: 0,
  };

  entries.forEach(({ action }) => {
    switch (action) {
      case "kettle_start":
      case "kettle_ready":
      case "kettle_stop":
      case "kettle_empty":
      case "kettle_refill":
        counts.water += 1;
        break;
      case "coffee_activate":
      case "coffee_select_espresso":
      case "coffee_select_lungo":
      case "coffee_cancel":
      case "coffee_capsule_empty":
      case "coffee_capsule_load":
        counts.coffee += 1;
        break;
      case "oven_preheat":
      case "oven_start_heat":
      case "oven_stop":
        counts.oven += 1;
        break;
      case "stop_all":
        counts.stop += 1;
        break;
      default:
        break;
    }
  });

  return [
    { id: "water", label: "Water", value: counts.water },
    { id: "coffee", label: "Coffee", value: counts.coffee },
    { id: "oven", label: "Oven", value: counts.oven },
    { id: "stop", label: "Stop", value: counts.stop },
  ].filter((item) => item.value > 0);
};

export const buildTimelineItems = (entries: LogEntry[]): LogTimelineItem[] =>
  [...entries]
    .slice(-6)
    .reverse()
    .map((entry) => ({
      id: entry.id,
      time: formatTimestamp(entry.timestamp),
      text: entry.message,
      variant: entry.action === "stop_all" ? "alert" : undefined,
    }));
