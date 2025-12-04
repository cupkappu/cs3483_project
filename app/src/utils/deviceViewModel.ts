import type { DeviceCardInfo, DeviceHeroSummary, DevicesState } from "../types";
import kettleImg from "../assets/Kettle.png";
import kettleEmptyImg from "../assets/KettleEmpty.png";
import kettleFullImg from "../assets/KettleFull.png";
import coffeeImg from "../assets/CoffeeCup.png";
import coffeeEspressoImg from "../assets/CoffeeCupEspresso.png";
import coffeeLungoImg from "../assets/CoffeeCupLungo.png";
import ovenImg from "../assets/oven.png";
import ovenHeatingImg from "../assets/OvenHalf.png";

const formatSize = (size: string | null) =>
  size ? size.charAt(0).toUpperCase() + size.slice(1) : "";

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const describeKettleLabel = (kettle: DevicesState["kettle"]) => {
  switch (kettle.status) {
    case "boiling":
      return kettle.timeRemaining != null
        ? `Boiling (${kettle.timeRemaining}s)`
        : "Boiling";
    case "ready":
      return "Ready";
    case "cooling":
      return `Cooling (${Math.round(kettle.temperature)}°C)`;
    case "water-empty":
      return "Needs Water";
    default:
      return `Standby (${Math.round(kettle.temperature)}°C)`;
  }
};

const describeCoffeeLabel = (coffee: DevicesState["coffee"]) => {
  switch (coffee.status) {
    case "waiting-selection":
      return "Select Size";
    case "brewing":
      return coffee.selectedSize
        ? `Brewing ${formatSize(coffee.selectedSize)}`
        : "Brewing";
    case "ready":
      return coffee.lastSize ? `${formatSize(coffee.lastSize)} Ready` : "Coffee Ready";
    case "needs-capsule":
      return "Capsule Empty";
    default:
      return "Standby";
  }
};

const describeOvenLabel = (oven: DevicesState["oven"]) => {
  switch (oven.status) {
    case "preheating":
      return `Preheating (${Math.round(oven.temperature)}°C)`;
    case "heating":
      return oven.timeRemaining != null
        ? `Heating (${oven.timeRemaining}s)`
        : "Heating";
    case "ready":
      return "Ready";
    default:
      return "Standby";
  }
};

const selectKettleIcon = (kettle: DevicesState["kettle"]) => {
  switch (kettle.status) {
    case "water-empty":
      return { src: kettleEmptyImg, alt: "Kettle out of water" };
    case "ready":
      return { src: kettleFullImg, alt: "Kettle ready" };
    default:
      return { src: kettleImg, alt: "Water kettle" };
  }
};

const selectKettleStatusIcon = (kettle: DevicesState["kettle"]) => {
  switch (kettle.status) {
    case "ready":
      return "✓";
    case "boiling":
      return "◎";
    case "cooling":
      return "≈";
    case "water-empty":
      return "!";
    default:
      return "–";
  }
};

const selectCoffeeIcon = (coffee: DevicesState["coffee"]) => {
  if (coffee.status === "ready") {
    if (coffee.lastSize === "espresso") {
      return { src: coffeeEspressoImg, alt: "Espresso ready" };
    }
    if (coffee.lastSize === "lungo") {
      return { src: coffeeLungoImg, alt: "Lungo ready" };
    }
  }
  return { src: coffeeImg, alt: "Coffee maker" };
};

const selectCoffeeStatusIcon = (coffee: DevicesState["coffee"]) => {
  switch (coffee.status) {
    case "needs-capsule":
      return "✕";
    case "waiting-selection":
      return "?";
    case "brewing":
      return "◎";
    case "ready":
      return "✓";
    default:
      return "–";
  }
};

const selectOvenIcon = (oven: DevicesState["oven"]) => {
  switch (oven.status) {
    case "preheating":
    case "heating":
      return { src: ovenHeatingImg, alt: "Oven heating" };
    default:
      return { src: ovenImg, alt: "Oven" };
  }
};

const selectOvenStatusIcon = (oven: DevicesState["oven"]) => {
  switch (oven.status) {
    case "preheating":
    case "heating":
      return "◎";
    case "ready":
      return "✓";
    default:
      return "–";
  }
};

const describeKettleFooter = (kettle: DevicesState["kettle"]) => {
  switch (kettle.status) {
    case "boiling":
      return kettle.timeRemaining != null ? `${kettle.timeRemaining} s` : "Heating";
    case "ready":
      return "Ready";
    case "cooling":
      return `${Math.round(kettle.temperature)} °C`;
    case "water-empty":
      return "Empty";
    default:
      return "Idle";
  }
};

const describeCoffeeDetail = (coffee: DevicesState["coffee"]) => {
  switch (coffee.status) {
    case "waiting-selection":
      return "Select espresso or lungo";
    case "brewing":
      if (coffee.selectedSize) {
        return coffee.timeRemaining != null
          ? `${formatSize(coffee.selectedSize)} in progress (${coffee.timeRemaining}s)`
          : `${formatSize(coffee.selectedSize)} in progress`;
      }
      return "Brewing";
    case "ready":
      return coffee.lastSize ? `Serve ${formatSize(coffee.lastSize)}` : "Serve immediately";
    case "needs-capsule":
      return "Insert capsule";
    default:
      return coffee.lastSize ? `${formatSize(coffee.lastSize)} last brew` : "Standby";
  }
};

const describeCoffeeFooter = (coffee: DevicesState["coffee"]) => {
  switch (coffee.status) {
    case "brewing":
      return coffee.selectedSize ? formatSize(coffee.selectedSize) : "Brew";
    case "ready":
      return coffee.lastSize ? formatSize(coffee.lastSize) : "Ready";
    case "needs-capsule":
      return "Capsule";
    default:
      return "Idle";
  }
};

const describeOvenDetail = (oven: DevicesState["oven"]) => {
  switch (oven.status) {
    case "preheating":
      return `Target ${oven.targetTemperature} °C`;
    case "heating":
      return `${oven.temperature} °C`;
    case "ready":
      return `Holding ${oven.temperature} °C`;
    default:
      return `${oven.temperature} °C`;
  }
};

const describeOvenFooter = (oven: DevicesState["oven"]) => {
  switch (oven.status) {
    case "preheating":
      return `${Math.round(clamp01(oven.temperature / oven.targetTemperature) * 100)}%`;
    case "heating":
      return oven.timeRemaining != null ? `${oven.timeRemaining} s` : "Heating";
    case "ready":
      return "Ready";
    default:
      return "Idle";
  }
};

const computeTimeProgress = (remaining: number | null, total: number | null) => {
  if (typeof remaining !== "number" || typeof total !== "number" || total <= 0) {
    return undefined;
  }
  return clamp01((total - remaining) / total);
};

const computeTemperatureProgress = (temperature: number, target: number) => {
  if (target <= 0) {
    return undefined;
  }
  return clamp01(temperature / target);
};

export const createDeviceSummaries = (
  devices: DevicesState,
): DeviceHeroSummary[] => {
  const { kettle, coffee, oven } = devices;

  const kettleIcon = selectKettleIcon(kettle);
  const coffeeIcon = selectCoffeeIcon(coffee);
  const ovenIcon = selectOvenIcon(oven);

  return [
    {
      id: "kettle",
      label: "Water Kettle",
      iconSrc: kettleIcon.src,
      iconAlt: kettleIcon.alt,
      variant: "device-hero--kettle",
      statusIcon: selectKettleStatusIcon(kettle),
      statusLabel: describeKettleLabel(kettle),
    },
    {
      id: "coffee",
      label: "Coffee Maker",
      iconSrc: coffeeIcon.src,
      iconAlt: coffeeIcon.alt,
      variant: "device-hero--capsule",
      statusIcon: selectCoffeeStatusIcon(coffee),
      statusLabel: describeCoffeeLabel(coffee),
    },
    {
      id: "oven",
      label: "Oven",
      iconSrc: ovenIcon.src,
      iconAlt: ovenIcon.alt,
      variant: "device-hero--oven",
      statusIcon: selectOvenStatusIcon(oven),
      statusLabel: describeOvenLabel(oven),
    },
  ];
};

export const createDeviceCards = (devices: DevicesState): DeviceCardInfo[] => {
  const { kettle, coffee, oven } = devices;

  const kettleVariant =
    kettle.status === "water-empty"
      ? "device-card--alert"
      : kettle.status === "boiling"
      ? "device-card--warning"
      : "device-card--idle";

  const coffeeVariant =
    coffee.status === "needs-capsule"
      ? "device-card--alert"
      : coffee.status === "brewing"
      ? "device-card--warning"
      : "device-card--idle";

  const ovenVariant =
    oven.status === "preheating" || oven.status === "heating"
      ? "device-card--warning"
      : "device-card--idle";

  const kettleState = (() => {
    switch (kettle.status) {
      case "boiling":
        return "Boiling";
      case "ready":
        return "Ready";
      case "cooling":
        return "Cooling";
      case "water-empty":
        return "Water Empty";
      default:
        return "Idle";
    }
  })();

  const coffeeState = (() => {
    switch (coffee.status) {
      case "waiting-selection":
        return "Select Size";
      case "brewing":
        return coffee.selectedSize
          ? `Brewing ${formatSize(coffee.selectedSize)}`
          : "Brewing";
      case "ready":
        return coffee.lastSize
          ? `${formatSize(coffee.lastSize)} Ready`
          : "Coffee Ready";
      case "needs-capsule":
        return "Capsule Empty";
      default:
        return "Idle";
    }
  })();

  const ovenState = (() => {
    switch (oven.status) {
      case "preheating":
        return "Preheating";
      case "heating":
        return "Heating";
      case "ready":
        return "Ready";
      default:
        return "Idle";
    }
  })();

  const kettleProgress = kettle.status === "boiling"
    ? computeTimeProgress(kettle.timeRemaining, kettle.timeTotal)
    : undefined;

  const coffeeProgress = coffee.status === "brewing"
    ? computeTimeProgress(coffee.timeRemaining, coffee.timeTotal)
    : undefined;

  const ovenProgress = oven.status === "preheating"
    ? computeTemperatureProgress(oven.temperature, oven.targetTemperature)
    : oven.status === "heating"
    ? computeTimeProgress(oven.timeRemaining, oven.timeTotal)
    : undefined;

  return [
    {
      id: "card-kettle",
      state: kettleState,
      detail:
        kettle.status === "water-empty"
          ? "Refill water"
          : kettle.status === "boiling"
          ? `${kettle.targetTemperature} °C target`
          : `${Math.round(kettle.temperature)} °C`,
      footerLabel: describeKettleFooter(kettle),
      variant: kettleVariant,
      progress: kettleProgress,
      isActive: kettle.status === "boiling",
    },
    {
      id: "card-coffee",
      state: coffeeState,
      detail: describeCoffeeDetail(coffee),
      footerLabel: describeCoffeeFooter(coffee),
      variant: coffeeVariant,
      progress: coffeeProgress,
      isActive: coffee.status === "brewing",
    },
    {
      id: "card-oven",
      state: ovenState,
      detail: describeOvenDetail(oven),
      footerLabel: describeOvenFooter(oven),
      variant: ovenVariant,
      progress: ovenProgress,
      isActive: oven.status === "preheating" || oven.status === "heating",
    },
  ];
};
