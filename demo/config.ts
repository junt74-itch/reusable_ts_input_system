import {
  defineInputConfig,
  key,
  pad,
  mouse,
  keyAxis2D,
  stick,
  dpad,
} from '../src/index';
import type { ButtonBinding, GamepadButtonName } from '../src/index';

export const GAMEPAD_BUTTONS: readonly GamepadButtonName[] = [
  'south',
  'east',
  'west',
  'north',
  'leftShoulder',
  'rightShoulder',
  'leftTrigger',
  'rightTrigger',
  'select',
  'start',
  'leftStick',
  'rightStick',
  'dpadUp',
  'dpadDown',
  'dpadLeft',
  'dpadRight',
] as const;

const WASD = keyAxis2D({ up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD' });
const ARROWS = keyAxis2D({
  up: 'ArrowUp',
  down: 'ArrowDown',
  left: 'ArrowLeft',
  right: 'ArrowRight',
});

export type GamepadDiagnosticAction = `gp_${GamepadButtonName}`;

// Object.fromEntries はキーの型が string に広がるため、リテラルキーの型を明示して
// input.action() の名前推論を効かせる。
const gamepadDiagnosticActions = Object.fromEntries(
  GAMEPAD_BUTTONS.map((button) => [`gp_${button}`, [pad(button)]]),
) as Record<GamepadDiagnosticAction, ButtonBinding[]>;

const diagnosticActions = {
  ...gamepadDiagnosticActions,
  ptr_primary: [mouse('primary')],
  ptr_secondary: [mouse('secondary')],
};

const diagnosticAxes2D = {
  diagLeftStick: [stick('left')],
  diagRightStick: [stick('right')],
} as const;

const diagnosticAxes1D = {
  diagLeftTrigger: [{ device: 'gamepad' as const, source: 'leftTrigger' as const }],
  diagRightTrigger: [{ device: 'gamepad' as const, source: 'rightTrigger' as const }],
} as const;

const sharedDiagnostic = {
  actions: diagnosticActions,
  axes2D: diagnosticAxes2D,
  axes1D: diagnosticAxes1D,
};

export const PLAYABLE_MAPS = ['quiz', 'exploration'] as const;
export type PlayableMap = (typeof PLAYABLE_MAPS)[number];

export const MAP_UI = {
  quiz: {
    label: 'Quiz / ADV',
    actions: ['confirm', 'cancel', 'menu'] as const,
    axes2D: ['menuNavigate'] as const,
    axes1D: [] as const,
  },
  exploration: {
    label: '3D Exploration',
    actions: ['interact', 'cancel', 'menu'] as const,
    axes2D: ['move', 'look'] as const,
    axes1D: ['zoom'] as const,
  },
} as const;

export const inputConfig = defineInputConfig({
  initialMap: 'quiz',
  maps: {
    quiz: {
      actions: {
        confirm: [key('Enter'), key('Space'), pad('south')],
        cancel: [key('Escape'), pad('east')],
        menu: [pad('start')],
        ...sharedDiagnostic.actions,
      },
      axes2D: {
        menuNavigate: [WASD, ARROWS, stick('left'), dpad()],
        ...sharedDiagnostic.axes2D,
      },
      axes1D: { ...sharedDiagnostic.axes1D },
    },
    exploration: {
      actions: {
        interact: [key('KeyE'), pad('south')],
        cancel: [key('Escape'), pad('east')],
        menu: [pad('start')],
        ...sharedDiagnostic.actions,
      },
      axes2D: {
        move: [WASD, stick('left')],
        look: [stick('right'), { device: 'pointer', source: 'delta' }],
        ...sharedDiagnostic.axes2D,
      },
      axes1D: {
        zoom: [
          { device: 'pointer', source: 'wheelY' },
          { device: 'gamepad', source: 'rightTrigger' },
        ],
        ...sharedDiagnostic.axes1D,
      },
    },
  },
});
