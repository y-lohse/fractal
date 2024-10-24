import { generatePalette } from "./colors";
import { Interactions } from "./interactions";
import { Point } from "./point";
import { createMandelbrotProgram } from "./shaders";
import "./style.css";

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
// statsElem.style.display = 'none';
statsElem.addEventListener("click", () => {
  navigator.clipboard.writeText(`${x} ${y} ${z}`);
});
app.appendChild(statsElem);

const currentPosition = new Point(
  -0.08778076492449352,
  -0.8724673555119864,
  980.205095807421
);

const targetPosition = new Point(
  currentPosition.x,
  currentPosition.y,
  currentPosition.z
);

Interactions.init(canvas, currentPosition, targetPosition);

let palette = generatePalette(Math.floor(new Date().getTime() / 1000));

let lastRender = performance.now();

const gl = glCanvas.getContext("webgl");
if (!gl) throw new Error("WebGL not supported");

const ctx = canvas.getContext("2d");
if (!ctx) throw new Error("2D context not supported");

const { resolutionLocation, centerLocation, zoomLocation } =
  createMandelbrotProgram(gl);

requestAnimationFrame(function loop(ts) {
  // TODO use greensock to animate this
  currentPosition.x =
    currentPosition.x + (targetPosition.x - currentPosition.x) * 0.1;
  currentPosition.y =
    currentPosition.y + (targetPosition.y - currentPosition.y) * 0.1;
  currentPosition.z =
    currentPosition.z + (targetPosition.z - currentPosition.z) * 0.1;

  palette = generatePalette(Math.floor(new Date().getTime()));
  render(gl, ctx);

  const elapsed = ts - lastRender;
  const fps = 1000 / elapsed;
  lastRender = ts;

  statsElem.textContent = `${currentPosition.x.toFixed(
    16
  )}x ${currentPosition.y.toFixed(16)}y ${currentPosition.z.toFixed(
    0
  )}z fps:${fps.toFixed(2)}`;

  // requestAnimationFrame(loop);
  setTimeout(() => requestAnimationFrame(loop), Math.min(elapsed, 1000 / 60));
});

const bg = [0, 0, 0];
function render(gl: WebGLRenderingContext, ctx: CanvasRenderingContext2D) {
  const pixelsCount = gl.canvas.width * gl.canvas.height;
  const pixels = new Uint8Array(pixelsCount * 4);
  gl.uniform2f(resolutionLocation, gl.canvas.width, gl.canvas.height);
  gl.uniform2f(centerLocation, currentPosition.x, currentPosition.y);
  gl.uniform1f(zoomLocation, currentPosition.z);
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
