export const GestureSignal = {
  None: "None",
  UpwardWave: "UpwardWave",
  DownwardWave: "DownwardWave",
  Fist: "Fist",
  Palm: "Palm",
  PushForward: "PushForward",
  TwoHandPalm: "TwoHandPalm",
} as const;

export type GestureSignal = (typeof GestureSignal)[keyof typeof GestureSignal];

export const gestureOptions: GestureSignal[] = [
  GestureSignal.UpwardWave,
  GestureSignal.DownwardWave,
  GestureSignal.Fist,
  GestureSignal.Palm,
  GestureSignal.PushForward,
  GestureSignal.TwoHandPalm,
];
