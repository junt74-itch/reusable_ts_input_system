import type {
  BindingDigitalState,
  GamepadAxis1DSource,
  GamepadButtonName,
  GamepadLike,
  ResolvedOptions,
} from '../core/types';
import {
  accumulatePress,
  accumulateRelease,
  createFrameAccumulator,
  finalizeDigitalEdges,
  type FrameAccumulator,
  type InputDevice,
} from './Device';

const BUTTON_INDEX: Record<GamepadButtonName, number> = {
  south: 0,
  east: 1,
  west: 2,
  north: 3,
  leftShoulder: 4,
  rightShoulder: 5,
  leftTrigger: 6,
  rightTrigger: 7,
  select: 8,
  start: 9,
  leftStick: 10,
  rightStick: 11,
  dpadUp: 12,
  dpadDown: 13,
  dpadLeft: 14,
  dpadRight: 15,
};

const AXIS_INDEX: Record<GamepadAxis1DSource, number> = {
  leftStickX: 0,
  leftStickY: 1,
  rightStickX: 2,
  rightStickY: 3,
  leftTrigger: 6,
  rightTrigger: 7,
};

type CopiedGamepad = {
  index: number;
  id: string;
  mapping: string;
  connected: boolean;
  buttons: number[];
  axes: number[];
};

export class GamepadDevice implements InputDevice {
  private readonly gamepadSource: () => ArrayLike<GamepadLike | null>;
  private readonly fixedIndex: number | undefined;
  private readonly triggerThreshold: number;
  private readonly deadZoneInner: number;
  private readonly deadZoneOuter: number;
  private readonly deviceSwitchThreshold: number;

  private current: CopiedGamepad | null = null;
  private prevHeldButtons = new Set<number>();
  private heldButtons = new Set<number>();
  private readonly frameEvents = new Map<number, FrameAccumulator>();
  private readonly pendingReleaseButtons = new Set<number>();
  private axes: number[] = [0, 0, 0, 0];
  private attached = false;
  private wasConnected = false;

  constructor(options: ResolvedOptions) {
    this.gamepadSource = options.gamepadSource;
    this.fixedIndex = options.gamepadIndex;
    this.triggerThreshold = options.triggerThreshold;
    this.deadZoneInner = options.deadZoneInner;
    this.deadZoneOuter = options.deadZoneOuter;
    this.deviceSwitchThreshold = options.deviceSwitchThreshold;
  }

  poll(): void {
    this.applyPendingReleases();

    const source = this.gamepadSource();
    const selected = selectGamepad(source, this.fixedIndex);

    if (selected === null) {
      if (this.wasConnected) {
        this.scheduleReleaseForHeldButtons();
      }
      this.current = null;
      this.wasConnected = false;
      this.heldButtons = new Set();
      this.axes = [0, 0, 0, 0];
      return;
    }

    this.wasConnected = true;
    this.current = copyGamepad(selected);

    const newHeld = new Set<number>();
    for (let i = 0; i < this.current.buttons.length; i++) {
      const value = this.current.buttons[i] ?? 0;
      const isTrigger = i === 6 || i === 7;
      const held = isTrigger ? value >= this.triggerThreshold : value >= 0.5;

      if (held) {
        newHeld.add(i);
      }
    }

    for (const index of newHeld) {
      if (!this.prevHeldButtons.has(index)) {
        const acc = this.getOrCreateAccumulator(index);
        accumulatePress(acc);
      }
    }

    for (const index of this.prevHeldButtons) {
      if (!newHeld.has(index)) {
        const acc = this.getOrCreateAccumulator(index);
        accumulateRelease(acc);
      }
    }

    this.heldButtons = newHeld;
    // ブラウザの Gamepad API は Y 軸の下方向が正のため、取り込み時に反転して
    // キーボード合成と同じ「上方向が正」の数学座標系へ揃える。
    this.axes = this.current.axes.map((value, index) => (index === 1 || index === 3 ? -value : value));
    while (this.axes.length < 4) {
      this.axes.push(0);
    }
  }

  endFrame(): void {
    this.frameEvents.clear();
    this.prevHeldButtons = new Set(this.heldButtons);
  }

  reset(): void {
    this.scheduleReleaseForHeldButtons();
    this.heldButtons.clear();
    this.axes = [0, 0, 0, 0];
    this.current = null;
  }

  attach(): void {
    if (this.attached || typeof window === 'undefined') {
      return;
    }
    this.attached = true;
  }

  detach(): void {
    this.attached = false;
  }

  getDigitalState(button: GamepadButtonName): BindingDigitalState {
    const index = BUTTON_INDEX[button];
    const held = this.heldButtons.has(index);
    const acc = this.frameEvents.get(index);
    const framePressed = acc?.pressed ?? 0;
    const frameReleased = acc?.released ?? 0;
    const prevHeld = this.prevHeldButtons.has(index);

    const edges = finalizeDigitalEdges(prevHeld, held, framePressed, frameReleased);

    return {
      held,
      pressedThisFrame: edges.pressedThisFrame,
      releasedThisFrame: edges.releasedThisFrame,
    };
  }

  getAxisValue(source: GamepadAxis1DSource): number {
    if (source === 'leftTrigger' || source === 'rightTrigger') {
      const index = AXIS_INDEX[source];
      return Math.max(0, this.current?.buttons[index] ?? 0);
    }
    const axisIndex = AXIS_INDEX[source];
    return this.axes[axisIndex] ?? 0;
  }

  getStick(source: 'leftStick' | 'rightStick'): { x: number; y: number } {
    if (source === 'leftStick') {
      return { x: this.axes[0] ?? 0, y: this.axes[1] ?? 0 };
    }
    return { x: this.axes[2] ?? 0, y: this.axes[3] ?? 0 };
  }

  getDpad(): { x: number; y: number } {
    let x = 0;
    let y = 0;
    if (this.heldButtons.has(BUTTON_INDEX.dpadLeft)) x -= 1;
    if (this.heldButtons.has(BUTTON_INDEX.dpadRight)) x += 1;
    if (this.heldButtons.has(BUTTON_INDEX.dpadUp)) y += 1;
    if (this.heldButtons.has(BUTTON_INDEX.dpadDown)) y -= 1;
    return { x, y };
  }

  getSnapshot(): { connected: boolean; id: string; index: number } {
    return {
      connected: this.current !== null,
      id: this.current?.id ?? '',
      index: this.current?.index ?? -1,
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

  hasSignificantAxisInput(): boolean {
    for (const source of ['leftStickX', 'leftStickY', 'rightStickX', 'rightStickY'] as const) {
      const raw = this.getAxisValue(source);
      const processed = applyAxialDeadZoneSingle(raw, this.deadZoneInner, this.deadZoneOuter);
      if (Math.abs(processed) > this.deviceSwitchThreshold) {
        return true;
      }
    }
    return false;
  }

  private scheduleReleaseForHeldButtons(): void {
    for (const index of this.heldButtons) {
      this.pendingReleaseButtons.add(index);
    }
    this.heldButtons.clear();
    this.axes = [0, 0, 0, 0];
    this.current = null;
  }

  private applyPendingReleases(): void {
    for (const index of this.pendingReleaseButtons) {
      const acc = this.getOrCreateAccumulator(index);
      accumulateRelease(acc);
    }
    this.pendingReleaseButtons.clear();
  }

  private getOrCreateAccumulator(index: number): FrameAccumulator {
    let acc = this.frameEvents.get(index);
    if (acc === undefined) {
      acc = createFrameAccumulator();
      this.frameEvents.set(index, acc);
    }
    return acc;
  }
}

function selectGamepad(
  source: ArrayLike<GamepadLike | null>,
  fixedIndex: number | undefined,
): GamepadLike | null {
  if (fixedIndex !== undefined) {
    return source[fixedIndex] ?? null;
  }

  let standardCandidate: GamepadLike | null = null;
  let fallbackCandidate: GamepadLike | null = null;

  for (let i = 0; i < source.length; i++) {
    const pad = source[i];
    if (pad === null || pad === undefined || !pad.connected) {
      continue;
    }
    if (fallbackCandidate === null || pad.index < fallbackCandidate.index) {
      fallbackCandidate = pad;
    }
    if (pad.mapping === 'standard') {
      if (standardCandidate === null || pad.index < standardCandidate.index) {
        standardCandidate = pad;
      }
    }
  }

  return standardCandidate ?? fallbackCandidate;
}

function copyGamepad(pad: GamepadLike): CopiedGamepad {
  const buttons: number[] = [];
  for (let i = 0; i < pad.buttons.length; i++) {
    const btn = pad.buttons[i];
    buttons.push(btn?.value ?? 0);
  }
  return {
    index: pad.index,
    id: pad.id,
    mapping: pad.mapping,
    connected: pad.connected,
    buttons,
    axes: [...pad.axes],
  };
}

function applyAxialDeadZoneSingle(value: number, inner: number, outer: number): number {
  const abs = Math.abs(value);
  if (abs <= inner) return 0;
  if (abs >= outer) return Math.sign(value);
  return Math.sign(value) * ((abs - inner) / (outer - inner));
}

export { BUTTON_INDEX, AXIS_INDEX };
