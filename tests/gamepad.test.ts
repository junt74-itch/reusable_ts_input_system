import { describe, expect, test } from 'bun:test';
import { keyAxis2D, pad, stick } from '../src/index';
import { createTestInputWithGamepad, createGamepadController } from './helpers';

describe('Gamepad 接続・切断', () => {
  test('接続時に gamepad.connected が true になる', () => {
    const padCtrl = createGamepadController();
    const input = createTestInputWithGamepad(
      {
        maps: {
          default: {
            actions: { jump: [pad('south')] },
          },
        },
      },
      padCtrl,
    );

    input.update();
    expect(input.gamepad.connected).toBe(true);
    expect(input.gamepad.id).toBe('Mock Gamepad');
    expect(input.gamepad.index).toBe(0);
  });

  test('切断時に押下中ボタンが強制解放され、次フレームで wasReleased() が立つ', () => {
    const padCtrl = createGamepadController();
    const input = createTestInputWithGamepad(
      {
        maps: {
          default: {
            actions: { jump: [pad('south')] },
          },
        },
      },
      padCtrl,
    );

    padCtrl.setButtonPressed('south');
    input.update();
    expect(input.action('jump').isPressed()).toBe(true);

    padCtrl.disconnect();
    input.update();
    expect(input.action('jump').isPressed()).toBe(false);
    expect(input.action('jump').wasReleased()).toBe(true);
    expect(input.gamepad.connected).toBe(false);
  });

  test('切断時に軸が 0 になる', () => {
    const padCtrl = createGamepadController();
    const input = createTestInputWithGamepad(
      {
        maps: {
          default: {
            axes2D: { move: [stick('left')] },
          },
        },
      },
      padCtrl,
    );

    padCtrl.setStick(0.8, -0.6);
    input.update();
    expect(Math.abs(input.axis2D('move').value.x)).toBeGreaterThan(0);

    padCtrl.disconnect();
    input.update();
    expect(input.axis2D('move').value.x).toBe(0);
    expect(input.axis2D('move').value.y).toBe(0);
  });

  test('再接続後に入力を受け付ける', () => {
    const padCtrl = createGamepadController();
    const input = createTestInputWithGamepad(
      {
        maps: {
          default: {
            actions: { jump: [pad('south')] },
          },
        },
      },
      padCtrl,
    );

    padCtrl.disconnect();
    input.update();

    padCtrl.reconnect();
    padCtrl.setButtonPressed('south');
    input.update();
    expect(input.gamepad.connected).toBe(true);
    expect(input.action('jump').isPressed()).toBe(true);
  });
});

describe('トリガー閾値', () => {
  test('triggerThreshold 未満ではデジタル判定が false', () => {
    const padCtrl = createGamepadController();
    const input = createTestInputWithGamepad(
      {
        maps: {
          default: {
            actions: { fire: [pad('leftTrigger')] },
          },
        },
      },
      padCtrl,
      { triggerThreshold: 0.5 },
    );

    padCtrl.setButtonValue(6, 0.4);
    input.update();
    expect(input.action('fire').isPressed()).toBe(false);
  });

  test('triggerThreshold 以上ではデジタル判定が true', () => {
    const padCtrl = createGamepadController();
    const input = createTestInputWithGamepad(
      {
        maps: {
          default: {
            actions: { fire: [pad('leftTrigger')] },
          },
        },
      },
      padCtrl,
      { triggerThreshold: 0.5 },
    );

    padCtrl.setButtonValue(6, 0.6);
    input.update();
    expect(input.action('fire').isPressed()).toBe(true);
    expect(input.action('fire').wasPressed()).toBe(true);
  });

  test('カスタム triggerThreshold が適用される', () => {
    const padCtrl = createGamepadController();
    const input = createTestInputWithGamepad(
      {
        maps: {
          default: {
            actions: { fire: [pad('rightTrigger')] },
          },
        },
      },
      padCtrl,
      { triggerThreshold: 0.8 },
    );

    padCtrl.setButtonValue(7, 0.7);
    input.update();
    expect(input.action('fire').isPressed()).toBe(false);

    padCtrl.setButtonValue(7, 0.85);
    input.update();
    expect(input.action('fire').isPressed()).toBe(true);
  });
});

describe('Gamepad スティック Y 軸', () => {
  test('ブラウザ生値を反転し、上方向が +1 の数学座標系になる', () => {
    const padCtrl = createGamepadController();
    const input = createTestInputWithGamepad(
      {
        maps: {
          default: {
            axes2D: { move: [stick('left')] },
          },
        },
      },
      padCtrl,
      { deadZone: { inner: 0, outer: 1 } },
    );

    padCtrl.setStick(0, -1);
    input.update();
    expect(input.axis2D('move').value.y).toBeCloseTo(1);

    padCtrl.setStick(0, 1);
    input.update();
    expect(input.axis2D('move').value.y).toBeCloseTo(-1);
  });

  test('キーボードとゲームパッドを同じ Axis2D に混在させても向きが一致する', () => {
    const padCtrl = createGamepadController();
    const input = createTestInputWithGamepad(
      {
        maps: {
          default: {
            axes2D: {
              move: [
                keyAxis2D({ up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD' }),
                stick('left'),
              ],
            },
          },
        },
      },
      padCtrl,
      { deadZone: { inner: 0, outer: 1 } },
    );

    input.devices.keyboard.handleKeyDown('KeyW');
    input.update();
    expect(input.axis2D('move').value.y).toBeCloseTo(1);
    input.devices.keyboard.handleKeyUp('KeyW');

    padCtrl.setStick(0, -1);
    input.update();
    expect(input.axis2D('move').value.y).toBeCloseTo(1);
  });

  test('dpad は数学座標系（up が +1）', () => {
    const padCtrl = createGamepadController();
    const input = createTestInputWithGamepad(
      {
        maps: {
          default: {
            axes2D: { move: [{ device: 'gamepad', source: 'dpad' }] },
          },
        },
      },
      padCtrl,
    );

    padCtrl.setButtonPressed('dpadUp');
    input.update();
    expect(input.axis2D('move').value.y).toBe(1);

    padCtrl.setButtonValue(12, 0);
    padCtrl.setButtonPressed('dpadDown');
    input.update();
    expect(input.axis2D('move').value.y).toBe(-1);
  });
});
