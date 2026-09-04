import type {
  Axis2DBinding,
  Axis2DState,
  NormalizedAxis2DDefinition,
  ProcessorConfig,
  Vector2,
} from './types';
import type { DeviceContext } from './Action';
import { applyProcessors } from '../processors';

type BindingWithProcessors = Axis2DBinding & { processors?: ProcessorConfig[] };

const SQRT2_OVER_2 = Math.SQRT1_2;

export class Axis2D implements Axis2DState {
  private readonly definition: NormalizedAxis2DDefinition;
  private readonly defaultDeadZone: { inner: number; outer: number; mode: 'radial' | 'axial' };
  private readonly valueObj = { x: 0, y: 0 };
  private active = true;

  constructor(
    definition: NormalizedAxis2DDefinition,
    defaultDeadZone: { inner: number; outer: number },
  ) {
    this.definition = definition;
    this.defaultDeadZone = { ...defaultDeadZone, mode: 'radial' };
  }

  get value(): Readonly<Vector2> {
    return this.valueObj;
  }

  resolve(devices: DeviceContext): void {
    if (!this.active) {
      this.valueObj.x = 0;
      this.valueObj.y = 0;
      return;
    }

    let bestX = 0;
    let bestY = 0;
    let bestLength = 0;

    for (const binding of this.definition.bindings) {
      const raw = resolveBindingRaw(binding, devices, this.definition.normalize);
      const processed = applyBindingProcessors(
        raw,
        binding as BindingWithProcessors,
        this.defaultDeadZone,
        binding,
      );

      let { x, y } = processed;

      if (binding.device !== 'pointer' && this.definition.normalize) {
        const len = Math.hypot(x, y);
        if (len > 1) {
          x /= len;
          y /= len;
        }
      }

      const length = Math.hypot(x, y);
      if (length > bestLength) {
        bestLength = length;
        bestX = x;
        bestY = y;
      }
    }

    const vector = applyProcessors(
      { x: bestX, y: bestY },
      this.definition.processors,
      this.defaultDeadZone,
    );

    this.valueObj.x = vector.x;
    this.valueObj.y = vector.y;
  }

  deactivate(): void {
    this.active = false;
    this.valueObj.x = 0;
    this.valueObj.y = 0;
  }

  activate(): void {
    this.active = true;
  }

  resetInactive(): void {
    this.valueObj.x = 0;
    this.valueObj.y = 0;
  }
}

class Axis2DFacade implements Axis2DState {
  private readonly inactiveValue: Vector2 = { x: 0, y: 0 };
  private readonly getDelegate: () => Axis2D | undefined;

  constructor(getDelegate: () => Axis2D | undefined) {
    this.getDelegate = getDelegate;
  }

  get value(): Readonly<Vector2> {
    return this.getDelegate()?.value ?? this.inactiveValue;
  }
}

export function createAxis2DFacade(getDelegate: () => Axis2D | undefined): Axis2DState {
  return new Axis2DFacade(getDelegate);
}

function resolveBindingRaw(
  binding: Axis2DBinding,
  devices: DeviceContext,
  normalize: boolean,
): Vector2 {
  switch (binding.device) {
    case 'keyboard': {
      let x = 0;
      let y = 0;
      if (devices.keyboard.isHeld(binding.right)) x += 1;
      if (devices.keyboard.isHeld(binding.left)) x -= 1;
      if (devices.keyboard.isHeld(binding.up)) y += 1;
      if (devices.keyboard.isHeld(binding.down)) y -= 1;

      if (normalize && x !== 0 && y !== 0) {
        return { x: x * SQRT2_OVER_2, y: y * SQRT2_OVER_2 };
      }
      return { x, y };
    }
    case 'gamepad':
      if (binding.source === 'leftStick' || binding.source === 'rightStick') {
        return devices.gamepad.getStick(binding.source);
      }
      return devices.gamepad.getDpad();
    case 'pointer':
      if (binding.source === 'position') {
        return devices.pointer.getPosition();
      }
      return devices.pointer.getDelta();
  }
}

function applyBindingProcessors(
  raw: Vector2,
  binding: BindingWithProcessors,
  defaultDeadZone: { inner: number; outer: number; mode: 'radial' | 'axial' },
  original: Axis2DBinding,
): Vector2 {
  if (original.device === 'pointer') {
    return raw;
  }

  const bindingProcessors = binding.processors;

  if (bindingProcessors !== undefined && bindingProcessors.length > 0) {
    return applyProcessors(raw, bindingProcessors, defaultDeadZone, false);
  }

  if (original.device === 'gamepad') {
    const mode = original.source === 'dpad' ? 'axial' : 'radial';
    return applyProcessors(raw, [], { ...defaultDeadZone, mode }, true);
  }

  return raw;
}
