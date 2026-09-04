import type { ActionState, ButtonBinding } from './types';
import { resolveActionState } from '../devices/Device';
import type { KeyboardDevice } from '../devices/KeyboardDevice';
import type { GamepadDevice } from '../devices/GamepadDevice';
import type { PointerDevice } from '../devices/PointerDevice';

export type DeviceContext = {
  keyboard: KeyboardDevice;
  gamepad: GamepadDevice;
  pointer: PointerDevice;
};

export class Action implements ActionState {
  private readonly bindings: readonly ButtonBinding[];
  private prevHeld = false;
  private held = false;
  private wasPressedValue = false;
  private wasReleasedValue = false;
  private active = true;

  constructor(bindings: readonly ButtonBinding[]) {
    this.bindings = bindings;
  }

  isPressed(): boolean {
    return this.active && this.held;
  }

  wasPressed(): boolean {
    return this.active && this.wasPressedValue;
  }

  wasReleased(): boolean {
    return this.active && this.wasReleasedValue;
  }

  resolve(devices: DeviceContext): void {
    if (!this.active) {
      this.held = false;
      this.wasPressedValue = false;
      this.wasReleasedValue = false;
      return;
    }

    let held = false;
    let anyPressed = false;

    for (const binding of this.bindings) {
      const state = getButtonState(binding, devices);
      if (state.held) held = true;
      if (state.pressedThisFrame) anyPressed = true;
    }

    const edges = resolveActionState(this.prevHeld, held, anyPressed);
    this.held = held;
    this.wasPressedValue = edges.wasPressed;
    this.wasReleasedValue = edges.wasReleased;
    this.prevHeld = held;
  }

  deactivate(): void {
    this.active = false;
    this.prevHeld = false;
    this.held = false;
    this.wasPressedValue = false;
    this.wasReleasedValue = false;
  }

  activate(devices: DeviceContext): void {
    this.active = true;
    let held = false;
    for (const binding of this.bindings) {
      const state = getButtonState(binding, devices);
      if (state.held) held = true;
    }
    this.prevHeld = held;
    this.held = held;
    this.wasPressedValue = false;
    this.wasReleasedValue = false;
  }

  resetInactive(): void {
    this.held = false;
    this.wasPressedValue = false;
    this.wasReleasedValue = false;
  }
}

class ActionFacade implements ActionState {
  private readonly getDelegate: () => Action | undefined;

  constructor(getDelegate: () => Action | undefined) {
    this.getDelegate = getDelegate;
  }

  isPressed(): boolean {
    return this.getDelegate()?.isPressed() ?? false;
  }

  wasPressed(): boolean {
    return this.getDelegate()?.wasPressed() ?? false;
  }

  wasReleased(): boolean {
    return this.getDelegate()?.wasReleased() ?? false;
  }
}

export function createActionFacade(getDelegate: () => Action | undefined): ActionState {
  return new ActionFacade(getDelegate);
}

function getButtonState(
  binding: ButtonBinding,
  devices: DeviceContext,
): { held: boolean; pressedThisFrame: boolean } {
  switch (binding.device) {
    case 'keyboard':
      return devices.keyboard.getDigitalState(binding.code);
    case 'gamepad':
      return devices.gamepad.getDigitalState(binding.button);
    case 'pointer':
      return devices.pointer.getDigitalState(binding.button);
  }
}
