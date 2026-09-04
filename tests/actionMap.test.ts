import { describe, expect, test } from 'bun:test';
import { key, keyAxis1D, keyAxis2D } from '../src/index';
import { createTestInput } from './helpers';

const mapConfig = {
  maps: {
    gameplay: {
      actions: {
        jump: [key('Space')],
      },
      axes1D: {
        moveX: [keyAxis1D('KeyA', 'KeyD')],
      },
      axes2D: {
        move: [keyAxis2D({ up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD' })],
      },
    },
    menu: {
      actions: {
        select: [key('Enter')],
        pause: [key('Space')],
      },
    },
  },
  initialMap: 'gameplay',
};

describe('Action Map 切り替え', () => {
  test('activateMap() で有効 Map が切り替わる', () => {
    const input = createTestInput(mapConfig);
    expect(input.activeMap).toBe('gameplay');

    input.activateMap('menu');
    expect(input.activeMap).toBe('menu');
  });

  test('旧 Map の Action は非アクティブ値を返す', () => {
    const input = createTestInput(mapConfig);

    input.devices.keyboard.handleKeyDown('Space');
    input.update();
    expect(input.action('jump').isPressed()).toBe(true);

    input.activateMap('menu');
    expect(input.action('jump').isPressed()).toBe(false);
    expect(input.action('jump').wasPressed()).toBe(false);
    expect(input.action('jump').wasReleased()).toBe(false);
  });

  test('旧 Map の Axis は非アクティブ値を返す', () => {
    const input = createTestInput(mapConfig);

    input.devices.keyboard.handleKeyDown('KeyD');
    input.update();
    expect(input.axis1D('moveX').value).toBe(1);

    input.activateMap('menu');
    expect(input.axis1D('moveX').value).toBe(0);
    expect(input.axis2D('move').value.x).toBe(0);
    expect(input.axis2D('move').value.y).toBe(0);
  });

  test('Map 切り替え時に wasReleased() は発生しない', () => {
    const input = createTestInput(mapConfig);

    input.devices.keyboard.handleKeyDown('Space');
    input.update();

    input.activateMap('menu');
    input.update();
    expect(input.action('jump').wasReleased()).toBe(false);
  });

  test('押下中のキーがある状態で切り替えても wasPressed() は立たず isPressed() は true', () => {
    const input = createTestInput(mapConfig);

    input.devices.keyboard.handleKeyDown('Space');
    input.update();
    expect(input.action('jump').wasPressed()).toBe(true);

    input.activateMap('menu');
    expect(input.action('jump').wasPressed()).toBe(false);
    expect(input.action('jump').isPressed()).toBe(false);
    expect(input.action('pause').wasPressed()).toBe(false);
    expect(input.action('pause').isPressed()).toBe(true);

    input.update();
    expect(input.action('pause').wasPressed()).toBe(false);
    expect(input.action('pause').isPressed()).toBe(true);
  });

  test('新 Map の Action は物理状態を prevHeld として初期化する', () => {
    const input = createTestInput(mapConfig);

    input.devices.keyboard.handleKeyDown('Enter');
    input.update();

    input.activateMap('menu');
    expect(input.action('select').wasPressed()).toBe(false);
    expect(input.action('select').isPressed()).toBe(true);
  });

  test('同じ Map を再度 activateMap() しても何もしない', () => {
    const input = createTestInput(mapConfig);

    input.devices.keyboard.handleKeyDown('Space');
    input.update();
    expect(input.action('jump').wasPressed()).toBe(true);

    input.activateMap('gameplay');
    expect(input.activeMap).toBe('gameplay');
    expect(input.action('jump').isPressed()).toBe(true);

    input.update();
    expect(input.action('jump').wasPressed()).toBe(false);
    expect(input.action('jump').isPressed()).toBe(true);
  });

  test('menu Map に存在しない jump は非アクティブだが throw されない', () => {
    const input = createTestInput(mapConfig);
    input.activateMap('menu');

    expect(() => input.action('jump')).not.toThrow();
    expect(input.action('jump').isPressed()).toBe(false);
  });
});
