import type {
  Axis1DBinding,
  Axis1DDefinition,
  Axis2DBinding,
  Axis2DDefinition,
  ButtonBinding,
  GamepadButtonName,
  InputConfig,
  InputSystemOptions,
  NormalizedActionMapConfig,
  NormalizedAxis1DDefinition,
  NormalizedAxis2DDefinition,
} from './types';

export function key(code: string): ButtonBinding {
  return { device: 'keyboard', code };
}

export function pad(button: GamepadButtonName): ButtonBinding {
  return { device: 'gamepad', button };
}

export function mouse(button: 'primary' | 'middle' | 'secondary'): ButtonBinding {
  return { device: 'pointer', button };
}

export function keyAxis1D(negative: string, positive: string): Axis1DBinding {
  return { device: 'keyboard', negative, positive };
}

export function keyAxis2D(keys: {
  up: string;
  down: string;
  left: string;
  right: string;
}): Axis2DBinding {
  return { device: 'keyboard', ...keys };
}

export function stick(side: 'left' | 'right'): Axis2DBinding {
  return {
    device: 'gamepad',
    source: side === 'left' ? 'leftStick' : 'rightStick',
  };
}

export function dpad(): Axis2DBinding {
  return { device: 'gamepad', source: 'dpad' };
}

export function defineInputConfig<C extends InputConfig>(config: C): C {
  return config;
}

export function resolveOptions(options?: InputSystemOptions): import('./types').ResolvedOptions {
  const domAvailable = typeof window !== 'undefined';
  const defaultTarget = domAvailable ? window : ({} as EventTarget);

  const deadZone = options?.deadZone;

  return {
    keyboardTarget: options?.keyboardTarget ?? defaultTarget,
    pointerTarget: options?.pointerTarget ?? defaultTarget,
    autoAttach: options?.autoAttach ?? domAvailable,
    preventDefault: options?.preventDefault ?? true,
    gamepadSource:
      options?.gamepadSource ??
      (() => {
        if (typeof navigator !== 'undefined' && navigator.getGamepads) {
          return navigator.getGamepads();
        }
        return [];
      }),
    gamepadIndex: options?.gamepadIndex,
    deadZoneInner: deadZone?.inner ?? 0.15,
    deadZoneOuter: deadZone?.outer ?? 0.95,
    triggerThreshold: options?.triggerThreshold ?? 0.5,
    deviceSwitchThreshold: options?.deviceSwitchThreshold ?? 0.5,
    initialDevice: options?.initialDevice ?? 'keyboard',
  };
}

export function normalizeActionMapConfig(
  config: import('./types').ActionMapConfig,
): NormalizedActionMapConfig {
  const actions: Record<string, readonly ButtonBinding[]> = {};
  const axes1D: Record<string, NormalizedAxis1DDefinition> = {};
  const axes2D: Record<string, NormalizedAxis2DDefinition> = {};

  if (config.actions) {
    for (const [name, bindings] of Object.entries(config.actions)) {
      actions[name] = bindings;
    }
  }

  if (config.axes1D) {
    for (const [name, def] of Object.entries(config.axes1D)) {
      axes1D[name] = normalizeAxis1DDefinition(def);
    }
  }

  if (config.axes2D) {
    for (const [name, def] of Object.entries(config.axes2D)) {
      axes2D[name] = normalizeAxis2DDefinition(def);
    }
  }

  return { actions, axes1D, axes2D };
}

function isAxis1DDefinition(
  def: readonly Axis1DBinding[] | Axis1DDefinition,
): def is Axis1DDefinition {
  return !Array.isArray(def);
}

function isAxis2DDefinition(
  def: readonly Axis2DBinding[] | Axis2DDefinition,
): def is Axis2DDefinition {
  return !Array.isArray(def);
}

function normalizeAxis1DDefinition(
  def: readonly Axis1DBinding[] | Axis1DDefinition,
): NormalizedAxis1DDefinition {
  const bindings = isAxis1DDefinition(def) ? def.bindings : def;
  const processors = isAxis1DDefinition(def) ? [...(def.processors ?? [])] : [];
  return { bindings, processors };
}

function normalizeAxis2DDefinition(
  def: readonly Axis2DBinding[] | Axis2DDefinition,
): NormalizedAxis2DDefinition {
  const bindings = isAxis2DDefinition(def) ? def.bindings : def;
  const processors = isAxis2DDefinition(def) ? [...(def.processors ?? [])] : [];
  const normalize = isAxis2DDefinition(def) ? (def.normalize ?? true) : true;
  return { bindings, processors, normalize };
}

export function collectBoundCodes(config: InputConfig): Set<string> {
  const codes = new Set<string>();

  for (const map of Object.values(config.maps)) {
    if (map.actions) {
      for (const bindings of Object.values(map.actions)) {
        for (const binding of bindings) {
          if (binding.device === 'keyboard') {
            codes.add(binding.code);
          }
        }
      }
    }

    if (map.axes1D) {
      for (const def of Object.values(map.axes1D)) {
        const bindings = isAxis1DDefinition(def) ? def.bindings : def;
        for (const binding of bindings) {
          if (binding.device === 'keyboard') {
            codes.add(binding.negative);
            codes.add(binding.positive);
          }
        }
      }
    }

    if (map.axes2D) {
      for (const def of Object.values(map.axes2D)) {
        const bindings = isAxis2DDefinition(def) ? def.bindings : def;
        for (const binding of bindings) {
          if (binding.device === 'keyboard') {
            codes.add(binding.up);
            codes.add(binding.down);
            codes.add(binding.left);
            codes.add(binding.right);
          }
        }
      }
    }
  }

  return codes;
}

export function getInitialMapName(config: InputConfig): string {
  if (config.initialMap !== undefined) {
    return config.initialMap;
  }
  const keys = Object.keys(config.maps);
  const first = keys[0];
  if (first === undefined) {
    throw new Error('InputConfig must contain at least one map');
  }
  return first;
}
