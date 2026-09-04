import { describe, expect, test } from 'bun:test';
import { applyDeadZone } from '../src/processors/DeadZone';
import { createTestInputWithGamepad, createGamepadController } from './helpers';

describe('デッドゾーン（純粋関数）', () => {
  const inner = 0.15;
  const outer = 0.95;

  test('axial: |v| <= inner では 0', () => {
    expect(applyDeadZone({ x: 0.15, y: 0 }, inner, outer, 'axial').x).toBe(0);
    expect(applyDeadZone({ x: -0.1, y: 0 }, inner, outer, 'axial').x).toBe(0);
  });

  test('axial: inner 直下（0.149）では 0', () => {
    expect(applyDeadZone({ x: 0.149, y: 0 }, inner, outer, 'axial').x).toBe(0);
  });

  test('axial: inner 直上で線形再スケーリング', () => {
    const value = 0.55;
    const expected = (value - inner) / (outer - inner);
    expect(applyDeadZone({ x: value, y: 0 }, inner, outer, 'axial').x).toBeCloseTo(expected);
  });

  test('axial: |v| >= outer では ±1 に飽和', () => {
    expect(applyDeadZone({ x: 0.95, y: 0 }, inner, outer, 'axial').x).toBe(1);
    expect(applyDeadZone({ x: 1.0, y: 0 }, inner, outer, 'axial').x).toBe(1);
    expect(applyDeadZone({ x: -0.96, y: 0 }, inner, outer, 'axial').x).toBe(-1);
  });

  test('radial:  magnitude <= inner では (0, 0)', () => {
    const result = applyDeadZone({ x: 0.1, y: 0.1 }, inner, outer, 'radial');
    expect(result.x).toBe(0);
    expect(result.y).toBe(0);
  });

  test('radial: magnitude >= outer では長さ 1 に正規化', () => {
    const result = applyDeadZone({ x: 0.95, y: 0.95 }, inner, outer, 'radial');
    expect(Math.hypot(result.x, result.y)).toBeCloseTo(1);
  });

  test('radial: inner と outer の間は線形再スケーリング', () => {
    const raw = { x: 0.5, y: 0 };
    const magnitude = 0.5;
    const remapped = (magnitude - inner) / (outer - inner);
    const result = applyDeadZone(raw, inner, outer, 'radial');
    expect(Math.hypot(result.x, result.y)).toBeCloseTo(remapped);
  });
});

describe('デッドゾーン（Gamepad Axis 統合）', () => {
  test('Gamepad 由来 Axis には既定デッドゾーンが自動適用される', () => {
    const padCtrl = createGamepadController();
    const input = createTestInputWithGamepad(
      {
        maps: {
          default: {
            axes1D: {
              move: [{ device: 'gamepad', source: 'leftStickX' }],
            },
          },
        },
      },
      padCtrl,
    );

    padCtrl.setAxis(0, 0.1);
    input.update();
    expect(input.axis1D('move').value).toBe(0);

    padCtrl.setAxis(0, 0.55);
    input.update();
    expect(input.axis1D('move').value).toBeCloseTo((0.55 - 0.15) / (0.95 - 0.15));

    padCtrl.setAxis(0, 1.0);
    input.update();
    expect(input.axis1D('move').value).toBeCloseTo(1);
  });

  test('トリガーは 0〜1 の片側値として扱われ負側へ写像しない', () => {
    const padCtrl = createGamepadController();
    const input = createTestInputWithGamepad(
      {
        maps: {
          default: {
            axes1D: {
              trigger: [{ device: 'gamepad', source: 'leftTrigger' }],
            },
          },
        },
      },
      padCtrl,
    );

    padCtrl.setButtonValue(6, 0.6);
    input.update();
    expect(input.axis1D('trigger').value).toBeGreaterThan(0);
    expect(input.axis1D('trigger').value).toBeLessThanOrEqual(1);
  });
});
