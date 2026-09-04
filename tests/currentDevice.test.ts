import { describe, expect, test } from 'bun:test';
import { createTestInput, createTestInputWithGamepad, createGamepadController } from './helpers';

describe('Current Device Detection', () => {
  test('初期値は initialDevice（既定 keyboard）', () => {
    const input = createTestInput({ maps: { default: {} } });
    expect(input.currentDevice).toBe('keyboard');
  });

  test('initialDevice オプションが反映される', () => {
    const input = createTestInput(
      { maps: { default: {} } },
      { initialDevice: 'gamepad' },
    );
    expect(input.currentDevice).toBe('gamepad');
  });

  test('キー押下で keyboard に切り替わる', () => {
    const input = createTestInput(
      { maps: { default: {} } },
      { initialDevice: 'gamepad' },
    );

    input.devices.keyboard.handleKeyDown('KeyA');
    input.update();
    expect(input.currentDevice).toBe('keyboard');
  });

  test('Gamepad ボタン押下で gamepad に切り替わる', () => {
    const padCtrl = createGamepadController();
    const input = createTestInputWithGamepad({ maps: { default: {} } }, padCtrl);

    padCtrl.setButtonPressed('south');
    input.update();
    expect(input.currentDevice).toBe('gamepad');
  });

  test('Pointer ボタン押下で pointer に切り替わる', () => {
    const input = createTestInput({ maps: { default: {} } });

    input.devices.pointer.handlePointerDown(0);
    input.update();
    expect(input.currentDevice).toBe('pointer');
  });

  test('wheel 入力で pointer に切り替わる', () => {
    const input = createTestInput({ maps: { default: {} } });

    input.devices.pointer.handleWheel(0, 100);
    input.update();
    expect(input.currentDevice).toBe('pointer');
  });

  test('カーソル移動だけでは pointer に切り替わらない', () => {
    const input = createTestInput({ maps: { default: {} } });

    input.devices.pointer.handlePointerMove(100, 200);
    input.update();
    expect(input.currentDevice).toBe('keyboard');
  });

  test('スティックの微小値では gamepad に切り替わらない', () => {
    const padCtrl = createGamepadController();
    const input = createTestInputWithGamepad({ maps: { default: {} } }, padCtrl);

    padCtrl.setStick(0.1, 0.1);
    input.update();
    expect(input.currentDevice).toBe('keyboard');
  });

  test('デッドゾーン処理後の軸が deviceSwitchThreshold を超えると gamepad に切り替わる', () => {
    const padCtrl = createGamepadController();
    const input = createTestInputWithGamepad(
      { maps: { default: {} } },
      padCtrl,
      { deviceSwitchThreshold: 0.5 },
    );

    padCtrl.setAxis(0, 0.6);
    input.update();
    expect(input.currentDevice).toBe('gamepad');
  });

  test('deviceSwitchThreshold 未満の軸入力では切り替わらない', () => {
    const padCtrl = createGamepadController();
    const input = createTestInputWithGamepad(
      { maps: { default: {} } },
      padCtrl,
      { deviceSwitchThreshold: 0.5 },
    );

    padCtrl.setAxis(0, 0.5);
    input.update();
    expect(input.currentDevice).toBe('keyboard');
  });

  test('同一フレーム複数入力時の優先順位: gamepad > keyboard > pointer', () => {
    const padCtrl = createGamepadController();
    const input = createTestInputWithGamepad({ maps: { default: {} } }, padCtrl);

    input.devices.keyboard.handleKeyDown('KeyA');
    input.devices.pointer.handlePointerDown(0);
    padCtrl.setButtonPressed('south');
    input.update();
    expect(input.currentDevice).toBe('gamepad');
  });

  test('gamepad なしで keyboard と pointer 同時入力では keyboard が優先', () => {
    const input = createTestInput({ maps: { default: {} } });

    input.devices.keyboard.handleKeyDown('KeyA');
    input.devices.pointer.handlePointerDown(0);
    input.update();
    expect(input.currentDevice).toBe('keyboard');
  });

  test('Map に無い入力でもデバイス切り替えが発生する', () => {
    const input = createTestInput({ maps: { default: {} } });

    input.devices.keyboard.handleKeyDown('KeyZ');
    input.update();
    expect(input.currentDevice).toBe('keyboard');
  });
});
