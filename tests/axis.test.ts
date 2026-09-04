import { describe, expect, test } from 'bun:test';
import { keyAxis1D, keyAxis2D, stick } from '../src/index';
import { createTestInput, createTestInputWithGamepad, createGamepadController } from './helpers';

const SQRT2_OVER_2 = Math.SQRT1_2;

describe('Axis1D キーボード合成', () => {
  test('positive 押下で +1', () => {
    const input = createTestInput({
      maps: {
        default: {
          axes1D: { move: [keyAxis1D('KeyA', 'KeyD')] },
        },
      },
    });

    input.devices.keyboard.handleKeyDown('KeyD');
    input.update();
    expect(input.axis1D('move').value).toBe(1);
  });

  test('negative 押下で -1', () => {
    const input = createTestInput({
      maps: {
        default: {
          axes1D: { move: [keyAxis1D('KeyA', 'KeyD')] },
        },
      },
    });

    input.devices.keyboard.handleKeyDown('KeyA');
    input.update();
    expect(input.axis1D('move').value).toBe(-1);
  });

  test('逆方向同時押しで 0 になる', () => {
    const input = createTestInput({
      maps: {
        default: {
          axes1D: { move: [keyAxis1D('KeyA', 'KeyD')] },
        },
      },
    });

    input.devices.keyboard.handleKeyDown('KeyA');
    input.devices.keyboard.handleKeyDown('KeyD');
    input.update();
    expect(input.axis1D('move').value).toBe(0);
  });
});

describe('Axis2D キーボード合成', () => {
  test('斜め入力が長さ 1 に正規化される', () => {
    const input = createTestInput({
      maps: {
        default: {
          axes2D: {
            move: [keyAxis2D({ up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD' })],
          },
        },
      },
    });

    input.devices.keyboard.handleKeyDown('KeyW');
    input.devices.keyboard.handleKeyDown('KeyD');
    input.update();

    const { x, y } = input.axis2D('move').value;
    expect(x).toBeCloseTo(SQRT2_OVER_2);
    expect(y).toBeCloseTo(SQRT2_OVER_2);
    expect(Math.hypot(x, y)).toBeCloseTo(1);
  });

  test('normalize: false では正規化されない', () => {
    const input = createTestInput({
      maps: {
        default: {
          axes2D: {
            move: {
              bindings: [keyAxis2D({ up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD' })],
              normalize: false,
            },
          },
        },
      },
    });

    input.devices.keyboard.handleKeyDown('KeyW');
    input.devices.keyboard.handleKeyDown('KeyD');
    input.update();

    expect(input.axis2D('move').value.x).toBe(1);
    expect(input.axis2D('move').value.y).toBe(1);
  });

  test('Y 軸は up が +1、down が -1（数学座標系）', () => {
    const input = createTestInput({
      maps: {
        default: {
          axes2D: {
            move: [keyAxis2D({ up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD' })],
          },
        },
      },
    });

    input.devices.keyboard.handleKeyDown('KeyW');
    input.update();
    expect(input.axis2D('move').value.y).toBe(1);

    input.devices.keyboard.handleKeyUp('KeyW');
    input.devices.keyboard.handleKeyDown('KeyS');
    input.update();
    expect(input.axis2D('move').value.y).toBe(-1);
  });
});

describe('複数 Binding の合成', () => {
  test('Axis1D は最大絶対値の Binding が勝つ（加算しない）', () => {
    const padCtrl = createGamepadController();
    const input = createTestInputWithGamepad(
      {
        maps: {
          default: {
            axes1D: {
              move: [
                keyAxis1D('KeyA', 'KeyD'),
                { device: 'gamepad', source: 'leftStickX' },
              ],
            },
          },
        },
      },
      padCtrl,
    );

    input.devices.keyboard.handleKeyDown('KeyD');
    padCtrl.setAxis(0, 0.3);
    input.update();
    expect(input.axis1D('move').value).toBeCloseTo(1);

    input.devices.keyboard.handleKeyUp('KeyD');
    padCtrl.setAxis(0, 0.8);
    input.update();
    expect(input.axis1D('move').value).toBeCloseTo(0.8125);
  });

  test('Axis2D は最大ベクトル長の Binding が勝つ', () => {
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
    );

    input.devices.keyboard.handleKeyDown('KeyD');
    padCtrl.setStick(0.3, 0);
    input.update();
    expect(input.axis2D('move').value.x).toBe(1);

    input.devices.keyboard.handleKeyUp('KeyD');
    padCtrl.setStick(0, -1);
    input.update();
    expect(input.axis2D('move').value.y).toBeCloseTo(1);
    expect(Math.abs(input.axis2D('move').value.x)).toBeLessThan(0.01);
  });

  test('同値の場合は宣言順で先の Binding が採用される', () => {
    const padCtrl = createGamepadController();
    const input = createTestInputWithGamepad(
      {
        maps: {
          default: {
            axes1D: {
              move: [
                keyAxis1D('KeyA', 'KeyD'),
                { device: 'gamepad', source: 'leftStickX' },
              ],
            },
          },
        },
      },
      padCtrl,
    );

    input.devices.keyboard.handleKeyDown('KeyD');
    padCtrl.setAxis(0, 1);
    input.update();
    expect(input.axis1D('move').value).toBe(1);
  });
});
