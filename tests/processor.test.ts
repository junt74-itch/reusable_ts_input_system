import { describe, expect, test } from 'bun:test';
import { applyClamp } from '../src/processors/Clamp';
import { applyInvert } from '../src/processors/Invert';
import { applyScale } from '../src/processors/Scale';
import { createTestInputWithGamepad, createGamepadController } from './helpers';

describe('Processor 純粋関数', () => {
  test('invert: x/y を反転する', () => {
    expect(applyInvert({ x: 1, y: -1 }, true, false)).toEqual({ x: -1, y: -1 });
    expect(applyInvert({ x: 1, y: -1 }, false, true)).toEqual({ x: 1, y: 1 });
    expect(applyInvert({ x: 1, y: -1 }, true, true)).toEqual({ x: -1, y: 1 });
  });

  test('scale: 因子を乗算する', () => {
    expect(applyScale({ x: 0.5, y: -1 }, 2)).toEqual({ x: 1, y: -2 });
  });

  test('clamp: min/max でクランプする', () => {
    expect(applyClamp({ x: 2, y: -2 }, -1, 1)).toEqual({ x: 1, y: -1 });
    expect(applyClamp({ x: 0.5, y: 0.3 }, 0, 1)).toEqual({ x: 0.5, y: 0.3 });
  });
});

describe('Processor 統合（Axis 定義経由）', () => {
  test('invert プロセッサが Axis1D に適用される', () => {
    const padCtrl = createGamepadController();
    const input = createTestInputWithGamepad(
      {
        maps: {
          default: {
            axes1D: {
              move: {
                bindings: [{ device: 'gamepad', source: 'leftStickX' }],
                processors: [{ type: 'invert', x: true }],
              },
            },
          },
        },
      },
      padCtrl,
      { deadZone: { inner: 0, outer: 1 } },
    );

    padCtrl.setAxis(0, 0.8);
    input.update();
    expect(input.axis1D('move').value).toBeCloseTo(-0.8);
  });

  test('scale プロセッサが Axis2D に適用される', () => {
    const padCtrl = createGamepadController();
    const input = createTestInputWithGamepad(
      {
        maps: {
          default: {
            axes2D: {
              move: {
                bindings: [{ device: 'gamepad', source: 'leftStick' }],
                processors: [{ type: 'scale', factor: 0.5 }],
              },
            },
          },
        },
      },
      padCtrl,
      { deadZone: { inner: 0, outer: 1 } },
    );

    padCtrl.setStick(1, 0);
    input.update();
    expect(input.axis2D('move').value.x).toBeCloseTo(0.5);
  });

  test('clamp プロセッサが Axis1D に適用される', () => {
    const padCtrl = createGamepadController();
    const input = createTestInputWithGamepad(
      {
        maps: {
          default: {
            axes1D: {
              move: {
                bindings: [{ device: 'gamepad', source: 'leftStickX' }],
                processors: [{ type: 'clamp', min: -0.5, max: 0.5 }],
              },
            },
          },
        },
      },
      padCtrl,
      { deadZone: { inner: 0, outer: 1 } },
    );

    padCtrl.setAxis(0, 1);
    input.update();
    expect(input.axis1D('move').value).toBeCloseTo(0.5);
  });

  test('Binding レベルの processors が適用される', () => {
    const padCtrl = createGamepadController();
    const input = createTestInputWithGamepad(
      {
        maps: {
          default: {
            axes1D: {
              move: [
                {
                  device: 'gamepad',
                  source: 'leftStickX',
                  processors: [{ type: 'scale', factor: 2 }],
                },
              ],
            },
          },
        },
      },
      padCtrl,
      { deadZone: { inner: 0, outer: 1 } },
    );

    padCtrl.setAxis(0, 0.4);
    input.update();
    expect(input.axis1D('move').value).toBeCloseTo(0.8);
  });
});
