export interface InputDevice {
  poll(): void;
  endFrame(): void;
  reset(): void;
  attach(): void;
  detach(): void;
}

export type DigitalState = {
  held: boolean;
  pressedThisFrame: boolean;
  releasedThisFrame: boolean;
};

export function createDigitalState(): DigitalState {
  return {
    held: false,
    pressedThisFrame: false,
    releasedThisFrame: false,
  };
}

export function finalizeDigitalEdges(
  prevHeld: boolean,
  held: boolean,
  framePressed: number,
  frameReleased: number,
): { pressedThisFrame: boolean; releasedThisFrame: boolean } {
  return {
    pressedThisFrame: framePressed > 0 || (!prevHeld && held),
    releasedThisFrame: frameReleased > 0 || (prevHeld && !held),
  };
}

export function resolveActionState(
  prevHeld: boolean,
  held: boolean,
  anyPressed: boolean,
): { wasPressed: boolean; wasReleased: boolean } {
  const wasPressed = !prevHeld && (held || anyPressed);
  const wasReleased = prevHeld ? !held : (anyPressed && !held);

  return { wasPressed, wasReleased };
}

export type FrameAccumulator = {
  pressed: number;
  released: number;
};

export function createFrameAccumulator(): FrameAccumulator {
  return { pressed: 0, released: 0 };
}

export function accumulatePress(acc: FrameAccumulator): void {
  acc.pressed += 1;
}

export function accumulateRelease(acc: FrameAccumulator): void {
  acc.released += 1;
}

export function resetFrameAccumulator(acc: FrameAccumulator): void {
  acc.pressed = 0;
  acc.released = 0;
}
