import Hammer from "hammerjs";
import { generatePalette } from "./colors";
import { createMandelbrotProgram } from "./shaders";
import "./style.css";
import { clamp } from "lodash";

const createCanvas = (width: number, height: number) => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  return canvas;
};

const app = document.querySelector<HTMLDivElement>("#app")!;
const canvas = createCanvas(window.innerWidth, window.innerHeight);
app.appendChild(canvas);
const glCanvas = createCanvas(window.innerWidth, window.innerHeight);

const statsElem = document.createElement("div");
statsElem.style.position = "absolute";
statsElem.style.bottom = "0";
statsElem.style.right = "0";
statsElem.style.color = "white";
statsElem.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
statsElem.style.padding = "0.5rem";
statsElem.style.fontFamily = "monospace";
statsElem.style.display = 'none';
statsElem.addEventListener("click", () => {
  navigator.clipboard.writeText(`${x} ${y} ${z}`);
});
app.appendChild(statsElem);

const MAX_ZOOM = 35140;
let x = 0;
let y = 0;
let z = 1;

x = -0.08778076492449352;
y = -0.8724673555119864;
z = 980.205095807421;

let xTarget = x;
let yTarget = y;
let zTarget = z;

let palette = generatePalette(Math.floor(new Date().getTime() / 1000));

let lastRender = performance.now();

const gl = glCanvas.getContext("webgl");
if (!gl) throw new Error("WebGL not supported");

const ctx = canvas.getContext("2d");
if (!ctx) throw new Error("2D context not supported");

const { resolutionLocation, centerLocation, zoomLocation } =
  createMandelbrotProgram(gl);

requestAnimationFrame(function loop(ts) {
  x = x + (xTarget - x) * 0.1;
  y = y + (yTarget - y) * 0.1;
  z = z + (zTarget - z) * 0.1;

  palette = generatePalette(Math.floor(new Date().getTime()));
  render(gl, ctx);

  const elapsed = ts - lastRender;
  const fps = 1000 / elapsed;
  lastRender = ts;

  statsElem.textContent = `${x.toFixed(16)}x ${y.toFixed(16)}y ${z.toFixed(
    0
  )}z fps:${fps.toFixed(2)}`;

  requestAnimationFrame(loop);
  // setTimeout(() => requestAnimationFrame(loop), Math.min(elapsed, 1000 / 60));
});

const hammer = new Hammer(canvas, {
  inputClass: Hammer.TouchInput,
});

hammer.get("pan").set({ direction: Hammer.DIRECTION_ALL });
hammer.get("pinch").set({ enable: true });

let initialZoom = 0;
let pinchDiff = { x: 0, y: 0 };
let startPosition = { x: 0, y: 0 };

hammer.on("pinchstart", function (ev) {
  initialZoom = z;
  startPosition = { x: x, y: y };
  pinchDiff = {
    x: ev.center.x - canvas.width / 2,
    y: ev.center.y - canvas.height / 2,
  };
});

hammer.on("pinch", function (ev) {
  z = clamp(initialZoom * ev.scale, 1, MAX_ZOOM);
  zTarget = z;

  const scale = Math.abs(1 - ev.scale);
  x = startPosition.x + (pinchDiff.x / (z * 365)) * scale;
  y = startPosition.y + (pinchDiff.y / (z * 365)) * scale;
  xTarget = x;
  yTarget = y;
});

let pinchEndTime = 0;
let ignoreThisPan = false;
hammer.on("pinchend", function (ev) {
  pinchEndTime = ev.timeStamp;
});

hammer.on("panstart", function (ev) {
  if (ev.timeStamp - pinchEndTime < 200) {
    ignoreThisPan = true;
    return;
  }
  ignoreThisPan = false;
  startPosition = { x: x, y: y };
});

hammer.on("pan", function (ev) {
  if (ignoreThisPan) return;
  const { distance, angle } = ev;
  const radians = (angle * Math.PI) / 180;
  const scaleFactor = z * 365;

  x = xTarget = startPosition.x - (distance * Math.cos(radians)) / scaleFactor;
  y = yTarget = startPosition.y - (distance * Math.sin(radians)) / scaleFactor;
});

hammer.on("panend", function (ev) {
  if (ignoreThisPan) return;
  const { velocityX, velocityY } = ev;
  xTarget -= (velocityX * 0.3) / z;
  yTarget -= (velocityY * 0.3) / z;
});

window.addEventListener("keydown", (event) => {
  const zoomStep = 0.5 * z;
  switch (event.key) {
    case "Enter":
      zTarget = Math.min(z + zoomStep, MAX_ZOOM);
      break;
    case "Backspace":
      zTarget = Math.max(z - zoomStep / 2, 1);
      break;
  }
});

const bg = [0, 0, 0];
function render(gl: WebGLRenderingContext, ctx: CanvasRenderingContext2D) {
  const pixelsCount = gl.canvas.width * gl.canvas.height;
  const pixels = new Uint8Array(pixelsCount * 4);
  gl.uniform2f(resolutionLocation, gl.canvas.width, gl.canvas.height);
  gl.uniform2f(centerLocation, x, y);
  gl.uniform1f(zoomLocation, z);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  gl.readPixels(
    0,
    0,
    gl.canvas.width,
    gl.canvas.height,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    pixels
  );

  const imageData = ctx.createImageData(ctx.canvas.width, ctx.canvas.height);

  for (let i = 0; i < pixelsCount; i++) {
    const iter = pixels[i * 4];
    const color = iter === 255 ? bg : palette[iter];

    imageData.data[i * 4] = color[0];
    imageData.data[i * 4 + 1] = color[1];
    imageData.data[i * 4 + 2] = color[2];
    imageData.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);
}
