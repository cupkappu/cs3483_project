import type {
  DeviceCardInfo,
  DeviceHeroSummary,
  DevicesState,
} from "../types";
import kettleImg from "../assets/Kettle.png";
import kettleEmptyImg from "../assets/KettleEmpty.png";
import kettleFullImg from "../assets/KettleFull.png";
import coffeeImg from "../assets/CoffeeCup.png";
import coffeeEspressoImg from "../assets/CoffeeCupEspresso.png";
import coffeeLungoImg from "../assets/CoffeeCupLungo.png";
import ovenImg from "../assets/oven.png";
import ovenHeatingImg from "../assets/OvenHalf.png";

const formatSize = (size: "espresso" | "lungo" | null) =>
  size ? size.charAt(0).toUpperCase() + size.slice(1) : "";

const describeKettleLabel = (devices: DevicesState["kettle"]) => {
  switch (devices.status) {
    case "boiling":
      return devices.timeRemaining
        ? `Boiling (${devices.timeRemaining}s)`
        : "Boiling";
    case "ready":
      return "Ready";
    case "water-empty":
      return "Needs Water";
    default:
      return "Standby";
  }
};

const describeCoffeeLabel = (devices: DevicesState["coffee"]) => {
  switch (devices.status) {
    case "brewing":
      return devices.lastSize ? `Brewing ${formatSize(devices.lastSize)}` : "Brewing";
    case "espresso-ready":
      return "Espresso Ready";
    case "lungo-ready":
      return "Lungo Ready";
    case "needs-capsule":
      return "Capsule Empty";
    default:
      return "Standby";
  }
};

const describeOvenLabel = (devices: DevicesState["oven"]) => {
  switch (devices.status) {
    case "heating":
      return devices.timeRemaining
        ? `Heating (${devices.timeRemaining}s)`
        : "Heating";
    case "ready":
      return "Ready";
    default:
      return "Standby";
  }
};

const selectKettleIcon = (devices: DevicesState["kettle"]) => {
  switch (devices.status) {
    case "water-empty":
      return { src: kettleEmptyImg, alt: "Kettle out of water" };
    case "ready":
      return { src: kettleFullImg, alt: "Kettle ready" };
    default:
      return { src: kettleImg, alt: "Water kettle" };
  }
};

const selectKettleStatusIcon = (devices: DevicesState["kettle"]) => {
  switch (devices.status) {
    case "ready":
      return "✓";
    case "boiling":
      return "◎";
    case "water-empty":
      return "!";
    default:
      return "–";
  }
};

const selectCoffeeIcon = (devices: DevicesState["coffee"]) => {
  switch (devices.status) {
    case "espresso-ready":
      return { src: coffeeEspressoImg, alt: "Espresso ready" };
    case "lungo-ready":
      return { src: coffeeLungoImg, alt: "Lungo ready" };
    default:
      return { src: coffeeImg, alt: "Coffee maker" };
  }
};

const selectCoffeeStatusIcon = (devices: DevicesState["coffee"]) => {
  switch (devices.status) {
    case "needs-capsule":
      return "✕";
    case "brewing":
      return "◎";
    case "espresso-ready":
    case "lungo-ready":
      return "✓";
    default:
      return "–";
  }
};

const selectOvenIcon = (devices: DevicesState["oven"]) => {
  switch (devices.status) {
    case "heating":
      return { src: ovenHeatingImg, alt: "Oven heating" };
    default:
      return { src: ovenImg, alt: "Oven" };
  }
};

const selectOvenStatusIcon = (devices: DevicesState["oven"]) => {
  switch (devices.status) {
    case "heating":
      return "◎";
    case "ready":
      return "✓";
    default:
      return "–";
  }
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

const describeKettleFooter = (devices: DevicesState["kettle"]) => {
  switch (devices.status) {
    case "boiling":
      return devices.timeRemaining ? `${devices.timeRemaining} s` : "Heating";
    case "ready":
      return "Ready";
    case "water-empty":
      return "Empty";
    default:
      return "Idle";
  }
};

const describeCoffeeDetail = (devices: DevicesState["coffee"]) => {
  switch (devices.status) {
    case "brewing":
      return devices.lastSize
        ? `${formatSize(devices.lastSize)} in progress`
        : "Brewing";
    case "espresso-ready":
    case "lungo-ready":
      return "Serve immediately";
    case "needs-capsule":
      return "Insert capsule";
    default:
      return devices.lastSize ? `${formatSize(devices.lastSize)} last brew` : "Standby";
  }
};

const describeCoffeeFooter = (devices: DevicesState["coffee"]) => {
  switch (devices.status) {
    case "brewing":
    case "espresso-ready":
    case "lungo-ready":
      return devices.lastSize ? formatSize(devices.lastSize) : "Brew";
    case "needs-capsule":
      return "Capsule";
    default:
      return "Idle";
  }
};

const describeOvenFooter = (devices: DevicesState["oven"]) => {
  switch (devices.status) {
    case "heating":
      return devices.timeRemaining ? `${devices.timeRemaining} s` : "Heating";
    case "ready":
      return "Ready";
    default:
      return "Idle";
  }
};

export const createDeviceCards = (devices: DevicesState): DeviceCardInfo[] => {
  const { kettle, coffee, oven } = devices;

  const kettleVariant =
    kettle.status === "boiling"
      ? "device-card--warning"
      : kettle.status === "water-empty"
      ? "device-card--alert"
      : "device-card--idle";

  const coffeeVariant =
    coffee.status === "needs-capsule"
      ? "device-card--alert"
      : coffee.status === "brewing"
      ? "device-card--warning"
      : "device-card--idle";

  const ovenVariant =
    oven.status === "heating"
      ? "device-card--warning"
      : oven.status === "ready"
      ? "device-card--idle"
      : "device-card--idle";

  return [
    {
      id: "card-kettle",
      state:
        kettle.status === "boiling"
          ? "Boiling"
          : kettle.status === "ready"
          ? "Ready"
          : kettle.status === "water-empty"
          ? "Water Empty"
          : "Standby",
      detail:
        kettle.status === "water-empty"
          ? "Refill water"
          : `${kettle.targetTemperature} °C`,
      footerLabel: describeKettleFooter(kettle),
      variant: kettleVariant,
    },
    {
      id: "card-coffee",
      state:
        coffee.status === "brewing"
          ? coffee.lastSize
            ? `Brewing ${formatSize(coffee.lastSize)}`
            : "Brewing"
          : coffee.status === "espresso-ready"
          ? "Espresso Ready"
          : coffee.status === "lungo-ready"
          ? "Lungo Ready"
          : coffee.status === "needs-capsule"
          ? "Capsule Empty"
          : "Idle",
      detail: describeCoffeeDetail(coffee),
      footerLabel: describeCoffeeFooter(coffee),
      variant: coffeeVariant,
    },
    {
      id: "card-oven",
      state:
        oven.status === "heating"
          ? "Heating"
          : oven.status === "ready"
          ? "Ready"
          : "Idle",
      detail: `${oven.temperature} °C`,
      footerLabel: describeOvenFooter(oven),
      variant: ovenVariant,
    },
  ];
};
