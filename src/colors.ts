import Alea from "alea";
import { createNoise3D } from "simplex-noise";

type tuple = [number, number];

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

const dominantRange: tuple = [0.2, 0.9];
// const darkenRange: tuple = [0.7, 0.9];
// const pulseRange: tuple = [0.2, 0.9];
// low = crisp, high = bleed
// const bleedRange: tuple = [0.2, 0.9];

const t = new Date().getTime();
// const prngs = [Alea(t), Alea(t + 1), Alea(t + 2)];
const prngs = [Alea(34545), Alea(3404), Alea(45634547)];
const noise3d = [
  createNoise3D(prngs[0]),
  createNoise3D(prngs[1]),
  createNoise3D(prngs[2]),
];

const noiseBetween = (noise: number, min: number, max: number) => {
  return min + Math.abs(noise) * (max - min);
};

export function generatePalette(x: number, y: number, z: number) {
  const max = 135140;
  const modZ = Math.log(z) / Math.log(max) + 0.2;
  const modX = x * modZ;
  const modY = y * modZ;

  const dominant = [
    noiseBetween(
      noise3d[0](modX, modY, modZ),
      dominantRange[0],
      dominantRange[1]
    ),
    noiseBetween(
      noise3d[1](modX, modY, modZ),
      dominantRange[0],
      dominantRange[1]
    ),
    noiseBetween(
      noise3d[2](modX, modY, modZ),
      dominantRange[0],
      dominantRange[1]
    ),
  ];
  const darken = [0.7, 0.7, 0.7];

  const pulse = [0.1, 0.1, 0.1];
  const bleed = [0.4, 0.4, 0.4];

  const palette = Array.from({ length: 256 }, (_, i) =>
    makeColor(i / 256, dominant, darken, bleed, pulse)
  );

  return palette;
}
