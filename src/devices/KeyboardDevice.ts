import type { BindingDigitalState, ResolvedOptions } from '../core/types';
import { collectBoundCodes } from '../core/Binding';
import type { InputConfig } from '../core/types';
import {
  accumulatePress,
  accumulateRelease,
  createFrameAccumulator,
  finalizeDigitalEdges,
  type FrameAccumulator,
  type InputDevice,
} from './Device';

export class KeyboardDevice implements InputDevice {
  private readonly held = new Set<string>();
  private readonly frameEvents = new Map<string, FrameAccumulator>();
  private readonly boundCodes: Set<string>;
  private readonly preventDefault: boolean;
  private readonly target: EventTarget;
  private prevHeld = new Set<string>();
  private attached = false;
  private disposed = false;

  private readonly onKeyDown = (event: Event): void => {
    const e = event as KeyboardEvent;
    if (e.repeat) {
      return;
    }
    this.handleKeyDown(e.code);

    if (
      this.preventDefault &&
      this.boundCodes.has(e.code) &&
      !isEditableTarget(e.target)
    ) {
      e.preventDefault();
    }
  };

  private readonly onKeyUp = (event: Event): void => {
    const e = event as KeyboardEvent;
    this.handleKeyUp(e.code);
  };

  private readonly onBlur = (): void => {
    this.reset();
  };

  private readonly onVisibilityChange = (): void => {
    if (typeof document !== 'undefined' && document.hidden) {
      this.reset();
    }
  };

  constructor(config: InputConfig, options: ResolvedOptions) {
    this.boundCodes = collectBoundCodes(config);
    this.preventDefault = options.preventDefault;
    this.target = options.keyboardTarget;
  }

  handleKeyDown(code: string): void {
    if (this.disposed) {
      return;
    }
    if (!this.held.has(code)) {
      this.held.add(code);
      const acc = this.getOrCreateAccumulator(code);
      accumulatePress(acc);
    }
  }

  handleKeyUp(code: string): void {
    if (this.disposed) {
      return;
    }
    if (this.held.has(code)) {
      this.held.delete(code);
      const acc = this.getOrCreateAccumulator(code);
      accumulateRelease(acc);
    }
  }

  isHeld(code: string): boolean {
    return this.held.has(code);
  }

  getDigitalState(code: string): BindingDigitalState {
    const held = this.held.has(code);
    const acc = this.frameEvents.get(code);
    const framePressed = acc?.pressed ?? 0;
    const frameReleased = acc?.released ?? 0;
    const prevHeld = this.prevHeld.has(code);

    const edges = finalizeDigitalEdges(prevHeld, held, framePressed, frameReleased);

    return {
      held,
      pressedThisFrame: edges.pressedThisFrame,
      releasedThisFrame: edges.releasedThisFrame,
    };
  }

  hasAnyPressedThisFrame(): boolean {
    for (const acc of this.frameEvents.values()) {
      if (acc.pressed > 0) {
        return true;
      }
    }
    return false;
  }

  poll(): void {
    // Keyboard はイベント駆動のため poll 時に追加処理なし
  }

  endFrame(): void {
    this.frameEvents.clear();
    this.prevHeld = new Set(this.held);
  }

  reset(): void {
    for (const code of this.held) {
      const acc = this.getOrCreateAccumulator(code);
      accumulateRelease(acc);
    }
    this.held.clear();
  }

  attach(): void {
    if (this.attached || typeof window === 'undefined') {
      return;
    }
    this.attached = true;
    this.target.addEventListener('keydown', this.onKeyDown);
    this.target.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  detach(): void {
    if (!this.attached || typeof window === 'undefined') {
      return;
    }
    this.attached = false;
    this.target.removeEventListener('keydown', this.onKeyDown);
    this.target.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
  }

  markDisposed(): void {
    this.disposed = true;
  }

  private getOrCreateAccumulator(code: string): FrameAccumulator {
    let acc = this.frameEvents.get(code);
    if (acc === undefined) {
      acc = createFrameAccumulator();
      this.frameEvents.set(code, acc);
    }
    return acc;
  }
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (target === null || !(target instanceof HTMLElement)) {
    return false;
  }
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
    return true;
  }
  return target.isContentEditable;
}
