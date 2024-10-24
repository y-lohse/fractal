import Hammer from "hammerjs";
import { clamp } from "lodash";
import { Point } from "./point";

export class Interactions {
  canvas: HTMLCanvasElement;
  hammer: HammerManager;
  gestureStartPosition: Point;
  currentPosition: Point;
  targetPosition: Point;

  MAX_ZOOM = 35140;
  pinchDiff: { x: number; y: number };
  pinchEndTime: number;
  ignoreThisPan: boolean;

  static init(
    canvas: HTMLCanvasElement,
    currentPosition: Point,
    targetPosition: Point
  ) {
    return new Interactions(canvas, currentPosition, targetPosition);
  }

  constructor(
    canvas: HTMLCanvasElement,
    currentPosition: Point,
    targetPosition: Point
  ) {
    this.canvas = canvas;
    this.currentPosition = currentPosition;
    this.targetPosition = targetPosition;
    this.hammer = new Hammer(canvas, {
      inputClass: Hammer.TouchInput,
    });

    this.gestureStartPosition = new Point(0, 0, 0);
    this.pinchDiff = { x: 0, y: 0 };
    this.pinchEndTime = 0;
    this.ignoreThisPan = false;

    this.hammer.get("pan").set({ direction: Hammer.DIRECTION_ALL });
    this.hammer.get("pinch").set({ enable: true });

    this.hammer.on("pinchstart", this.onPinchStart.bind(this));
    this.hammer.on("pinch", this.onPinch.bind(this));
    this.hammer.on("pinchend", this.onPinchEnd.bind(this));

    this.hammer.on("panstart", this.onPanStart.bind(this));
    this.hammer.on("pan", this.onPan.bind(this));
    this.hammer.on("panend", this.onPanEnd.bind(this));

    window.addEventListener("keydown", this.onKeydown.bind(this));
  }

  onPinchStart(ev: HammerInput) {
    this.gestureStartPosition.fromPoint(this.currentPosition);
    this.pinchDiff = {
      x: ev.center.x - this.canvas.width / 2,
      y: ev.center.y - this.canvas.height / 2,
    };
  }

  onPinch(ev: HammerInput) {
    const scale = Math.abs(1 - ev.scale);
    this.targetPosition.z = this.currentPosition.z = clamp(
      this.gestureStartPosition.z * ev.scale,
      1,
      this.MAX_ZOOM
    );

    this.targetPosition.x = this.currentPosition.x =
      this.gestureStartPosition.x +
      (this.pinchDiff.x / (this.currentPosition.z * 365)) * scale;
    this.targetPosition.y = this.currentPosition.y =
      this.gestureStartPosition.y +
      (this.pinchDiff.y / (this.currentPosition.z * 365)) * scale;
  }

  onPinchEnd(ev: HammerInput) {
    this.pinchEndTime = ev.timeStamp;
  }

  onPanStart(ev: HammerInput) {
    if (ev.timeStamp - this.pinchEndTime < 200) {
      this.ignoreThisPan = true;
      return;
    }
    this.ignoreThisPan = false;
    this.gestureStartPosition.fromPoint(this.currentPosition);
  }

  onPan(ev: HammerInput) {
    if (this.ignoreThisPan) return;
    const { distance, angle } = ev;
    const radians = (angle * Math.PI) / 180;
    const scaleFactor = this.currentPosition.z * 365;

    this.targetPosition.x = this.currentPosition.x =
      this.gestureStartPosition.x -
      (distance * Math.cos(radians)) / scaleFactor;
    this.targetPosition.y = this.currentPosition.y =
      this.gestureStartPosition.y -
      (distance * Math.sin(radians)) / scaleFactor;
  }

  onPanEnd(ev: HammerInput) {
    if (this.ignoreThisPan) return;
    const { velocityX, velocityY } = ev;
    this.targetPosition.x -= (velocityX * 0.3) / this.currentPosition.z;
    this.targetPosition.y -= (velocityY * 0.3) / this.currentPosition.z;
  }

  onKeydown(ev: KeyboardEvent) {
    const zoomStep = 0.5 * this.currentPosition.z;
    switch (ev.key) {
      case "Enter":
        this.targetPosition.z = Math.min(
          this.currentPosition.z + zoomStep,
          this.MAX_ZOOM
        );
        break;
      case "Backspace":
        this.targetPosition.z = Math.max(
          this.currentPosition.z - zoomStep / 2,
          1
        );
        break;
    }
  }
}
