import { describe, expect, test } from 'bun:test';
import { mouse } from '../src/index';
import { createTestInput } from './helpers';

describe('Pointer 入力', () => {
  test('position が更新される', () => {
    const input = createTestInput({
      maps: {
        default: {
          axes2D: {
            cursor: [{ device: 'pointer', source: 'position' }],
          },
        },
      },
    });

    input.devices.pointer.handlePointerMove(100, 200);
    input.update();

    expect(input.pointer.position.x).toBe(100);
    expect(input.pointer.position.y).toBe(200);
    expect(input.axis2D('cursor').value.x).toBe(100);
    expect(input.axis2D('cursor').value.y).toBe(200);
  });

  test('delta がフレーム内の移動量を反映する', () => {
    const input = createTestInput({
      maps: {
        default: {
          axes2D: {
            drag: [{ device: 'pointer', source: 'delta' }],
          },
        },
      },
    });

    input.devices.pointer.handlePointerMove(10, 20);
    input.devices.pointer.handlePointerMove(15, 25);
    input.update();

    expect(input.pointer.delta.x).toBe(15);
    expect(input.pointer.delta.y).toBe(25);
    expect(input.axis2D('drag').value.x).toBe(15);
    expect(input.axis2D('drag').value.y).toBe(25);
  });

  test('delta は update() ごとにリセットされる', () => {
    const input = createTestInput({
      maps: { default: {} },
    });

    input.devices.pointer.handlePointerMove(10, 20);
    input.update();
    expect(input.pointer.delta.x).toBe(10);

    input.update();
    expect(input.pointer.delta.x).toBe(0);
    expect(input.pointer.delta.y).toBe(0);
  });

  test('wheel がフレーム内に蓄積される', () => {
    const input = createTestInput({
      maps: { default: {} },
    });

    input.devices.pointer.handleWheel(0, 100);
    input.devices.pointer.handleWheel(0, 50);
    input.update();

    expect(input.pointer.wheel.x).toBe(0);
    expect(input.pointer.wheel.y).toBe(150);
  });

  test('wheel は update() ごとにリセットされる', () => {
    const input = createTestInput({
      maps: { default: {} },
    });

    input.devices.pointer.handleWheel(10, 20);
    input.update();
    expect(input.pointer.wheel.x).toBe(10);
    expect(input.pointer.wheel.y).toBe(20);

    input.update();
    expect(input.pointer.wheel.x).toBe(0);
    expect(input.pointer.wheel.y).toBe(0);
  });

  test('wheelX / wheelY を Axis1D として利用できる', () => {
    const input = createTestInput({
      maps: {
        default: {
          axes1D: {
            scrollX: [{ device: 'pointer', source: 'wheelX' }],
            scrollY: [{ device: 'pointer', source: 'wheelY' }],
          },
        },
      },
    });

    input.devices.pointer.handleWheel(30, -40);
    input.update();

    expect(input.axis1D('scrollX').value).toBe(30);
    expect(input.axis1D('scrollY').value).toBe(-40);
  });

  test('pointer ボタンが Action として機能する', () => {
    const input = createTestInput({
      maps: {
        default: {
          actions: { click: [mouse('primary')] },
        },
      },
    });

    input.devices.pointer.handlePointerDown(0);
    input.update();
    expect(input.action('click').isPressed()).toBe(true);
    expect(input.action('click').wasPressed()).toBe(true);

    input.devices.pointer.handlePointerUp(0);
    input.update();
    expect(input.action('click').wasReleased()).toBe(true);
  });

  test('pointer position/delta は正規化・デッドゾーンの対象外', () => {
    const input = createTestInput({
      maps: {
        default: {
          axes2D: {
            cursor: [{ device: 'pointer', source: 'position' }],
          },
        },
      },
    });

    input.devices.pointer.handlePointerMove(50, 50);
    input.update();
    expect(input.axis2D('cursor').value.x).toBe(50);
    expect(input.axis2D('cursor').value.y).toBe(50);
  });
});
