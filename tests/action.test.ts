import { describe, expect, test } from 'bun:test';
import { key, pad } from '../src/index';
import { createTestInput, createTestInputWithGamepad, createGamepadController } from './helpers';

const baseConfig = {
  maps: {
    default: {
      actions: {
        jump: [key('Space')],
        confirm: [key('Enter'), pad('south')],
      },
    },
  },
};

describe('Action エッジ検出', () => {
  test('wasPressed() が 1 フレームだけ true になる', () => {
    const input = createTestInput(baseConfig);
    const action = input.action('jump');

    input.devices.keyboard.handleKeyDown('Space');
    input.update();
    expect(action.wasPressed()).toBe(true);
    expect(action.isPressed()).toBe(true);

    input.update();
    expect(action.wasPressed()).toBe(false);
    expect(action.isPressed()).toBe(true);

    input.devices.keyboard.handleKeyUp('Space');
    input.update();
    expect(action.wasPressed()).toBe(false);
    expect(action.wasReleased()).toBe(true);

    input.update();
    expect(action.wasReleased()).toBe(false);
  });

  test('wasReleased() が 1 フレームだけ true になる', () => {
    const input = createTestInput(baseConfig);
    const action = input.action('jump');

    input.devices.keyboard.handleKeyDown('Space');
    input.update();

    input.devices.keyboard.handleKeyUp('Space');
    input.update();
    expect(action.wasReleased()).toBe(true);
    expect(action.isPressed()).toBe(false);

    input.update();
    expect(action.wasReleased()).toBe(false);
    expect(action.isPressed()).toBe(false);
  });

  test('isPressed() が押下中に継続する', () => {
    const input = createTestInput(baseConfig);
    const action = input.action('jump');

    input.devices.keyboard.handleKeyDown('Space');
    input.update();
    expect(action.isPressed()).toBe(true);

    input.update();
    expect(action.isPressed()).toBe(true);

    input.update();
    expect(action.isPressed()).toBe(true);

    input.devices.keyboard.handleKeyUp('Space');
    input.update();
    expect(action.isPressed()).toBe(false);
  });

  test('同一フレーム内の押下＋解放で wasPressed/wasReleased が両方 true、isPressed は false', () => {
    const input = createTestInput(baseConfig);
    const action = input.action('jump');

    input.devices.keyboard.handleKeyDown('Space');
    input.devices.keyboard.handleKeyUp('Space');
    input.update();

    expect(action.wasPressed()).toBe(true);
    expect(action.wasReleased()).toBe(true);
    expect(action.isPressed()).toBe(false);
  });

  test('同一フレーム内で update() を 2 回呼ぶと 2 回目はエッジが立たない', () => {
    const input = createTestInput(baseConfig);
    const action = input.action('jump');

    input.devices.keyboard.handleKeyDown('Space');
    input.update();
    expect(action.wasPressed()).toBe(true);

    input.update();
    expect(action.wasPressed()).toBe(false);
    expect(action.wasReleased()).toBe(false);
  });
});

describe('複数 Binding の OR 解決', () => {
  test('片方保持中にもう片方を押下しても wasPressed() が立たない', () => {
    const padCtrl = createGamepadController();
    const inputWithPad = createTestInputWithGamepad(baseConfig, padCtrl);
    const action = inputWithPad.action('confirm');

    inputWithPad.devices.keyboard.handleKeyDown('Enter');
    inputWithPad.update();
    expect(action.wasPressed()).toBe(true);
    expect(action.isPressed()).toBe(true);

    padCtrl.setButtonPressed('south');
    inputWithPad.update();
    expect(action.wasPressed()).toBe(false);
    expect(action.isPressed()).toBe(true);
  });

  test('片方保持中にもう片方を解放しても wasReleased() が立たない', () => {
    const padCtrl = createGamepadController();
    const input = createTestInputWithGamepad(baseConfig, padCtrl);
    const action = input.action('confirm');

    input.devices.keyboard.handleKeyDown('Enter');
    padCtrl.setButtonPressed('south');
    input.update();
    expect(action.isPressed()).toBe(true);

    padCtrl.setButtonValue(0, 0);
    input.update();
    expect(action.wasReleased()).toBe(false);
    expect(action.isPressed()).toBe(true);

    padCtrl.setButtonPressed('south');
    input.devices.keyboard.handleKeyUp('Enter');
    input.update();
    expect(action.wasReleased()).toBe(false);
    expect(action.isPressed()).toBe(true);
  });

  test('すべて解放すると wasReleased() が立つ', () => {
    const padCtrl = createGamepadController();
    const input = createTestInputWithGamepad(baseConfig, padCtrl);
    const action = input.action('confirm');

    input.devices.keyboard.handleKeyDown('Enter');
    padCtrl.setButtonPressed('south');
    input.update();

    input.devices.keyboard.handleKeyUp('Enter');
    padCtrl.setButtonValue(0, 0);
    input.update();
    expect(action.wasReleased()).toBe(true);
    expect(action.isPressed()).toBe(false);
  });

  test('Enter を押したまま Gamepad south を押しても wasPressed() は再度 true にならない', () => {
    const padCtrl = createGamepadController();
    const input = createTestInputWithGamepad(baseConfig, padCtrl);
    const action = input.action('confirm');

    input.devices.keyboard.handleKeyDown('Enter');
    input.update();
    expect(action.wasPressed()).toBe(true);

    padCtrl.setButtonPressed('south');
    input.update();
    expect(action.wasPressed()).toBe(false);

    input.devices.keyboard.handleKeyUp('Enter');
    input.update();
    expect(action.wasReleased()).toBe(false);
    expect(action.isPressed()).toBe(true);

    padCtrl.setButtonValue(0, 0);
    input.update();
    expect(action.wasReleased()).toBe(true);
  });
});
