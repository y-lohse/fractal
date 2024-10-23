import Alea from "alea";
import BezierEasing from "bezier-easing";

const prng = Alea(new Date().getTime());

type tuple = [number, number];

function randomBetween([min, max]: tuple = [0, 0]) {
  return min + prng() * (max - min);
}

function makeColor(
  t: number,
  a: number[],
  b: number[],
  c: number[],
  d: number[]
) {
  const twoPi = 6.28318;
  return [
    (a[0] - b[0] * Math.cos(twoPi * (c[0] * t + d[0]))) * 255,
    (a[1] - b[1] * Math.cos(twoPi * (c[1] * t + d[1]))) * 255,
    (a[2] - b[2] * Math.cos(twoPi * (c[2] * t + d[2]))) * 255,
  ];
}

const dominantRange: tuple = [0.1, 0.9];
const dominantGradients = [
  [randomBetween(dominantRange), randomBetween(dominantRange)],
  [randomBetween(dominantRange), randomBetween(dominantRange)],
  [randomBetween(dominantRange), randomBetween(dominantRange)],
];

const darkenRange: tuple = [0.7, 0.9];
const darkenGradients = [
  [randomBetween(darkenRange), randomBetween(darkenRange)],
  [randomBetween(darkenRange), randomBetween(darkenRange)],
  [randomBetween(darkenRange), randomBetween(darkenRange)],
];

const pulseRange: tuple = [0.2, 0.9];
const pulseBase = [randomBetween(pulseRange), randomBetween(pulseRange)];
const maxPulseSpead = 0.1;
const pulseRand = prng();
const pulseMutationProbablity = 0.4;
const pulseVariation =
  pulseRand > pulseMutationProbablity
    ? maxPulseSpead *
      ((pulseRand - pulseMutationProbablity) / (1 - pulseMutationProbablity))
    : 0;
const pulseGradients = [
  pulseBase,
  [pulseBase[0] - pulseVariation, pulseBase[1] + pulseVariation],
  [pulseBase[0] - pulseVariation, pulseBase[1] + pulseVariation],
];

// low = crisp, high = bleed
const bleedRange: tuple = [0.2, 0.9];
const bleedBase = [randomBetween(bleedRange), randomBetween(bleedRange)];
const maxBleedSpead = 0.2;
const bleedRand = prng();
const bleedMutationProbablity = 0.4;
const bleedVariation =
  bleedRand > bleedMutationProbablity
    ? maxBleedSpead *
      ((bleedRand - bleedMutationProbablity) / (1 - bleedMutationProbablity))
    : 0;
const bleedGradients = [
  bleedBase,
  [bleedBase[0] - bleedVariation, bleedBase[1] + bleedVariation],
  [bleedBase[0] - bleedVariation, bleedBase[1] + bleedVariation],
];

// https://gre.github.io/bezier-easing-editor/example/
const easing = BezierEasing(0.27, 0.14, 0.13, 1.05);

const interpolate = (a: number, b: number, t: number) => a + (b - a) * t;

export function generatePalette(t: number) {
  const tSecond = Math.floor(t / 40);
  const normalized = (tSecond % 1000) / 1000;
  const doubled = normalized * 2;
  const final = doubled > 1 ? 2 - doubled : doubled;
  const eased = easing(final);

  const dominant = Array.from({ length: 3 }, (_, i) => {
    return interpolate(dominantGradients[i][0], dominantGradients[i][1], eased);
  });
  const darken = Array.from({ length: 3 }, (_, i) => {
    return interpolate(darkenGradients[i][0], darkenGradients[i][1], eased);
  });
  const pulse = Array.from({ length: 3 }, (_, i) => {
    return interpolate(pulseGradients[i][0], pulseGradients[i][1], eased);
  });
  const bleed = Array.from({ length: 3 }, (_, i) => {
    return interpolate(bleedGradients[i][0], bleedGradients[i][1], eased);
  });

  const palette = Array.from({ length: 256 }, (_, i) =>
    makeColor(i / 256, dominant, darken, bleed, pulse)
  );
  return palette;
}
