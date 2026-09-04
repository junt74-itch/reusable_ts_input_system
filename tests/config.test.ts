import { describe, expect, test } from 'bun:test';
import { key } from '../src/index';
import { createTestInput } from './helpers';

const config = {
  maps: {
    gameplay: {
      actions: { jump: [key('Space')] },
      axes1D: {},
      axes2D: {},
    },
    menu: {
      actions: { select: [key('Enter')] },
    },
  },
};

describe('設定とエラーハンドリング', () => {
  test('initialMap 省略時に maps の先頭キーが選ばれる', () => {
    const input = createTestInput(config);
    expect(input.activeMap).toBe('gameplay');
  });

  test('initialMap 指定時はその Map が選ばれる', () => {
    const input = createTestInput({ ...config, initialMap: 'menu' });
    expect(input.activeMap).toBe('menu');
  });

  test('未知の Action 名で Error が throw される', () => {
    const input = createTestInput(config);
    expect(() => input.action('unknown' as 'jump')).toThrow('Unknown action');
  });

  test('未知の Axis1D 名で Error が throw される', () => {
    const input = createTestInput(config);
    expect(() => input.axis1D('unknown' as never)).toThrow('Unknown axis1D');
  });

  test('未知の Axis2D 名で Error が throw される', () => {
    const input = createTestInput(config);
    expect(() => input.axis2D('unknown' as never)).toThrow('Unknown axis2D');
  });

  test('未知の Map 名で activateMap() が Error を throw する', () => {
    const input = createTestInput(config);
    expect(() => input.activateMap('unknown' as 'menu')).toThrow('Unknown map');
  });

  test('定義済みだが非アクティブ Map の名前では throw されない', () => {
    const input = createTestInput(config);
    expect(() => input.activateMap('menu')).not.toThrow();
    expect(input.activeMap).toBe('menu');
  });

  test('存在するが現在の Map に含まれない Action 名は throw せず非アクティブ値を返す', () => {
    const input = createTestInput(config);
    input.activateMap('menu');

    expect(() => input.action('jump')).not.toThrow();
    expect(input.action('jump').isPressed()).toBe(false);
  });
});

describe('ライフサイクル', () => {
  test('dispose() 後に update() を呼んでもエラーにならない', () => {
    const input = createTestInput({
      maps: {
        default: {
          actions: { jump: [key('Space')] },
        },
      },
    });

    input.devices.keyboard.handleKeyDown('Space');
    input.update();
    expect(input.action('jump').isPressed()).toBe(true);

    input.dispose();
    expect(() => input.update()).not.toThrow();
    expect(input.action('jump').isPressed()).toBe(false);
  });

  test('dispose() 後は仮想入力が無視される', () => {
    const input = createTestInput({
      maps: {
        default: {
          actions: { jump: [key('Space')] },
        },
      },
    });

    input.dispose();
    input.devices.keyboard.handleKeyDown('Space');
    input.update();
    expect(input.action('jump').isPressed()).toBe(false);
  });

  test('attach() の多重呼び出しは無視される', () => {
    const input = createTestInput({ maps: { default: {} } });
    expect(() => {
      input.attach();
      input.attach();
    }).not.toThrow();
  });
});

describe('action/axis ファサード', () => {
  test('action() は同一インスタンスを返す', () => {
    const input = createTestInput({
      maps: {
        default: {
          actions: { jump: [key('Space')] },
        },
      },
    });

    expect(input.action('jump')).toBe(input.action('jump'));
  });

  test('axis2D().value は毎フレーム同一オブジェクトを更新して返す', () => {
    const input = createTestInput({
      maps: {
        default: {
          axes2D: {
            move: [
              {
                device: 'keyboard',
                up: 'KeyW',
                down: 'KeyS',
                left: 'KeyA',
                right: 'KeyD',
              },
            ],
          },
        },
      },
    });

    input.update();
    const ref1 = input.axis2D('move').value;
    input.devices.keyboard.handleKeyDown('KeyW');
    input.update();
    const ref2 = input.axis2D('move').value;

    expect(ref1).toBe(ref2);
    expect(ref2.y).toBe(1);
  });
});
