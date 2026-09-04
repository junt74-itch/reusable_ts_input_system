import type { BindingDigitalState, PointerButtonName, ResolvedOptions } from '../core/types';
import {
  accumulatePress,
  accumulateRelease,
  createFrameAccumulator,
  finalizeDigitalEdges,
  type FrameAccumulator,
  type InputDevice,
} from './Device';

const BUTTON_INDEX: Record<PointerButtonName, number> = {
  primary: 0,
  middle: 1,
  secondary: 2,
};

export class PointerDevice implements InputDevice {
  private readonly target: EventTarget;
  private readonly held = new Set<number>();
  private readonly frameEvents = new Map<number, FrameAccumulator>();
  private prevHeld = new Set<number>();
  private attached = false;
  private disposed = false;

  private positionX = 0;
  private positionY = 0;
  private deltaX = 0;
  private deltaY = 0;
  private wheelX = 0;
  private wheelY = 0;

  private readonly onPointerDown = (event: Event): void => {
    const e = event as PointerEvent;
    this.handlePointerDown(e.button);
  };

  private readonly onPointerUp = (event: Event): void => {
    const e = event as PointerEvent;
    this.handlePointerUp(e.button);
  };

  private readonly onPointerMove = (event: Event): void => {
    const e = event as PointerEvent;
    const coords = resolveCoordinates(e, this.target);
    this.handlePointerMove(coords.x, coords.y);
  };

  private readonly onWheel = (event: Event): void => {
    const e = event as WheelEvent;
    this.handleWheel(e.deltaX, e.deltaY);
  };

  private readonly onPointerCancel = (): void => {
    this.reset();
  };

  private readonly onContextMenu = (event: Event): void => {
    event.preventDefault();
  };

  private readonly onBlur = (): void => {
    this.reset();
  };

  private readonly onVisibilityChange = (): void => {
    if (typeof document !== 'undefined' && document.hidden) {
      this.reset();
    }
  };

  constructor(options: ResolvedOptions) {
    this.target = options.pointerTarget;
  }

  handlePointerDown(button: number): void {
    if (this.disposed) {
      return;
    }
    if (!this.held.has(button)) {
      this.held.add(button);
      const acc = this.getOrCreateAccumulator(button);
      accumulatePress(acc);
    }
  }

  handlePointerUp(button: number): void {
    if (this.disposed) {
      return;
    }
    if (this.held.has(button)) {
      this.held.delete(button);
      const acc = this.getOrCreateAccumulator(button);
      accumulateRelease(acc);
    }
  }

  handlePointerMove(x: number, y: number): void {
    if (this.disposed) {
      return;
    }
    this.deltaX += x - this.positionX;
    this.deltaY += y - this.positionY;
    this.positionX = x;
    this.positionY = y;
  }

  handleWheel(dx: number, dy: number): void {
    if (this.disposed) {
      return;
    }
    this.wheelX += dx;
    this.wheelY += dy;
  }

  getDigitalState(button: PointerButtonName): BindingDigitalState {
    const index = BUTTON_INDEX[button];
    const held = this.held.has(index);
    const acc = this.frameEvents.get(index);
    const framePressed = acc?.pressed ?? 0;
    const frameReleased = acc?.released ?? 0;
    const prevHeld = this.prevHeld.has(index);

    const edges = finalizeDigitalEdges(prevHeld, held, framePressed, frameReleased);

    return {
      held,
      pressedThisFrame: edges.pressedThisFrame,
      releasedThisFrame: edges.releasedThisFrame,
    };
  }

  getPosition(): { x: number; y: number } {
    return { x: this.positionX, y: this.positionY };
  }

  getDelta(): { x: number; y: number } {
    return { x: this.deltaX, y: this.deltaY };
  }

  getWheel(): { x: number; y: number } {
    return { x: this.wheelX, y: this.wheelY };
  }

  hasAnyPressedThisFrame(): boolean {
    for (const acc of this.frameEvents.values()) {
      if (acc.pressed > 0) {
        return true;
      }
    }
    return false;
  }

  hasWheelInput(): boolean {
    return this.wheelX !== 0 || this.wheelY !== 0;
  }

  poll(): void {
    // Pointer はイベント駆動のため poll 時に追加処理なし
  }

  endFrame(): void {
    this.frameEvents.clear();
    this.prevHeld = new Set(this.held);
    this.deltaX = 0;
    this.deltaY = 0;
    this.wheelX = 0;
    this.wheelY = 0;
  }

  reset(): void {
    for (const button of this.held) {
      const acc = this.getOrCreateAccumulator(button);
      accumulateRelease(acc);
    }
    this.held.clear();
  }

  attach(): void {
    if (this.attached || typeof window === 'undefined') {
      return;
    }
    this.attached = true;
    this.target.addEventListener('pointerdown', this.onPointerDown);
    this.target.addEventListener('pointerup', this.onPointerUp);
    this.target.addEventListener('pointermove', this.onPointerMove);
    this.target.addEventListener('wheel', this.onWheel, { passive: true });
    this.target.addEventListener('pointercancel', this.onPointerCancel);
    this.target.addEventListener('contextmenu', this.onContextMenu);
    window.addEventListener('blur', this.onBlur);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  detach(): void {
    if (!this.attached || typeof window === 'undefined') {
      return;
    }
    this.attached = false;
    this.target.removeEventListener('pointerdown', this.onPointerDown);
    this.target.removeEventListener('pointerup', this.onPointerUp);
    this.target.removeEventListener('pointermove', this.onPointerMove);
    this.target.removeEventListener('wheel', this.onWheel);
    this.target.removeEventListener('pointercancel', this.onPointerCancel);
    this.target.removeEventListener('contextmenu', this.onContextMenu);
    window.removeEventListener('blur', this.onBlur);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
  }

  markDisposed(): void {
    this.disposed = true;
  }

  private getOrCreateAccumulator(button: number): FrameAccumulator {
    let acc = this.frameEvents.get(button);
    if (acc === undefined) {
      acc = createFrameAccumulator();
      this.frameEvents.set(button, acc);
    }
    return acc;
  }
}

function resolveCoordinates(
  event: PointerEvent,
  target: EventTarget,
): { x: number; y: number } {
  if (target instanceof Element) {
    const rect = target.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }
  return { x: event.clientX, y: event.clientY };
}

export { BUTTON_INDEX as POINTER_BUTTON_INDEX };
