import {
  createInputSystem,
  defineInputConfig,
} from '../src/index';
import type {
  GamepadLike,
  InputConfig,
  InputSystem,
  InputSystemOptions,
} from '../src/index';

export type MutableGamepad = GamepadLike & {
  buttons: Array<{ value: number; pressed: boolean }>;
  axes: number[];
};

export function createMockGamepad(): MutableGamepad {
  const buttons = Array.from({ length: 16 }, () => ({ value: 0, pressed: false }));
  const axes = [0, 0, 0, 0];
  return {
    index: 0,
    id: 'Mock Gamepad',
    mapping: 'standard',
    connected: true,
    buttons,
    axes,
  };
}

export type GamepadController = {
  gamepad: MutableGamepad;
  setButtonValue(index: number, value: number): void;
  setButtonPressed(buttonName: keyof typeof BUTTON_NAMES, value?: number): void;
  setAxis(index: number, value: number): void;
  setStick(x: number, y: number, side?: 'left' | 'right'): void;
  disconnect(): void;
  reconnect(): void;
};

const BUTTON_NAMES = {
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
} as const;

export function createGamepadController(): GamepadController {
  const gamepad = createMockGamepad();

  return {
    gamepad,
    setButtonValue(index: number, value: number): void {
      const btn = gamepad.buttons[index];
      if (btn !== undefined) {
        btn.value = value;
        btn.pressed = value >= 0.5;
      }
    },
    setButtonPressed(buttonName: keyof typeof BUTTON_NAMES, value = 1): void {
      this.setButtonValue(BUTTON_NAMES[buttonName], value);
    },
    setAxis(index: number, value: number): void {
      gamepad.axes[index] = value;
    },
    setStick(x: number, y: number, side: 'left' | 'right' = 'left'): void {
      if (side === 'left') {
        gamepad.axes[0] = x;
        gamepad.axes[1] = y;
      } else {
        gamepad.axes[2] = x;
        gamepad.axes[3] = y;
      }
    },
    disconnect(): void {
      gamepad.connected = false;
    },
    reconnect(): void {
      gamepad.connected = true;
    },
  };
}

export function createTestInput<C extends InputConfig>(
  config: C,
  options?: InputSystemOptions,
): InputSystem<C> {
  return createInputSystem(config, { autoAttach: false, ...options });
}

export function createTestInputWithGamepad<C extends InputConfig>(
  config: C,
  controller: GamepadController,
  options?: InputSystemOptions,
): InputSystem<C> {
  return createInputSystem(config, {
    autoAttach: false,
    gamepadSource: () => [controller.gamepad],
    ...options,
  });
}

export { defineInputConfig };
