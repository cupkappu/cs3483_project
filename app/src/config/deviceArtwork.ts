import type {
  CoffeeState,
  DeviceHeroMedia,
  DeviceId,
  DevicesState,
  KettleState,
  OvenState,
} from "../types";
import kettleImg from "../assets/Kettle.png";
import kettleEmptyImg from "../assets/KettleEmpty.png";
import kettleFullImg from "../assets/KettleFull.png";
import kettleFillingVideo from "../assets/KettleFilling.mp4";
import coffeeImg from "../assets/CoffeeCup.png";
import coffeeEspressoImg from "../assets/CoffeeCupEspresso.png";
import coffeeLungoImg from "../assets/CoffeeCupLungo.png";
import ovenImg from "../assets/oven.png";
import ovenHeatingImg from "../assets/OvenHalf.png";

export type HeroArtwork = DeviceHeroMedia;

interface DeviceArtworkRule<TState> {
  matches: (state: TState) => boolean;
  hero: HeroArtwork;
}

const createArtworkResolver = <TState>(
  rules: DeviceArtworkRule<TState>[],
  fallback: HeroArtwork,
) => {
  return (state: TState): HeroArtwork => {
    const match = rules.find((rule) => rule.matches(state));
    return match?.hero ?? fallback;
  };
};

const kettleHeroResolver = createArtworkResolver<KettleState>(
  [
    {
      matches: (state) => state.status === "refilling",
      hero: {
        kind: "video",
        src: kettleFillingVideo,
        alt: "Kettle refilling",
        poster: kettleEmptyImg,
        autoPlay: true,
        loop: true,
        muted: true,
      },
    },
    {
      matches: (state) => state.status === "water-empty",
      hero: { kind: "image", src: kettleEmptyImg, alt: "Kettle out of water" },
    },
    {
      matches: (state) => state.status === "ready",
      hero: { kind: "image", src: kettleFullImg, alt: "Kettle ready" },
    },
  ],
  { kind: "image", src: kettleImg, alt: "Water kettle" },
);

const coffeeHeroResolver = createArtworkResolver<CoffeeState>(
  [
    {
      matches: (state) => state.status === "ready" && state.lastSize === "espresso",
      hero: { kind: "image", src: coffeeEspressoImg, alt: "Espresso ready" },
    },
    {
      matches: (state) => state.status === "ready" && state.lastSize === "lungo",
      hero: { kind: "image", src: coffeeLungoImg, alt: "Lungo ready" },
    },
  ],
  { kind: "image", src: coffeeImg, alt: "Coffee maker" },
);

const ovenHeroResolver = createArtworkResolver<OvenState>(
  [
    {
      matches: (state) => state.status === "preheating" || state.status === "heating",
      hero: { kind: "image", src: ovenHeatingImg, alt: "Oven heating" },
    },
  ],
  { kind: "image", src: ovenImg, alt: "Oven" },
);

const heroResolvers: { [K in DeviceId]: (state: DevicesState[K]) => HeroArtwork } = {
  kettle: kettleHeroResolver,
  coffee: coffeeHeroResolver,
  oven: ovenHeroResolver,
};

export const resolveDeviceHeroArtwork = <K extends DeviceId>(
  deviceId: K,
  state: DevicesState[K],
): HeroArtwork => heroResolvers[deviceId](state);
