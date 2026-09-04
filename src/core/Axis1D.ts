import type {
  Axis1DBinding,
  Axis1DState,
  NormalizedAxis1DDefinition,
  ProcessorConfig,
} from './types';
import type { DeviceContext } from './Action';
import { applyProcessors } from '../processors';

type BindingWithProcessors = Axis1DBinding & { processors?: ProcessorConfig[] };

export class Axis1D implements Axis1DState {
  private readonly definition: NormalizedAxis1DDefinition;
  private readonly defaultDeadZone: { inner: number; outer: number; mode: 'radial' | 'axial' };
  value = 0;
  private active = true;

  constructor(
    definition: NormalizedAxis1DDefinition,
    defaultDeadZone: { inner: number; outer: number },
  ) {
    this.definition = definition;
    this.defaultDeadZone = { ...defaultDeadZone, mode: 'axial' };
  }

  resolve(devices: DeviceContext): void {
    if (!this.active) {
      this.value = 0;
      return;
    }

    let bestValue = 0;
    let bestAbs = 0;

    for (const binding of this.definition.bindings) {
      const raw = resolveBindingRaw(binding, devices);
      const processed = applyBindingProcessors(
        raw,
        binding as BindingWithProcessors,
        this.defaultDeadZone,
        binding,
      );
      const abs = Math.abs(processed);
      if (abs > bestAbs) {
        bestAbs = abs;
        bestValue = processed;
      }
    }

    const vector = applyProcessors(
      { x: bestValue, y: 0 },
      this.definition.processors,
      { ...this.defaultDeadZone, mode: 'axial' },
    );

    this.value = vector.x;
  }

  deactivate(): void {
    this.active = false;
    this.value = 0;
  }

  activate(): void {
    this.active = true;
  }

  resetInactive(): void {
    this.value = 0;
  }
}

class Axis1DFacade implements Axis1DState {
  private readonly getDelegate: () => Axis1D | undefined;

  constructor(getDelegate: () => Axis1D | undefined) {
    this.getDelegate = getDelegate;
  }

  get value(): number {
    return this.getDelegate()?.value ?? 0;
  }
}

export function createAxis1DFacade(getDelegate: () => Axis1D | undefined): Axis1DState {
  return new Axis1DFacade(getDelegate);
}

function resolveBindingRaw(binding: Axis1DBinding, devices: DeviceContext): number {
  switch (binding.device) {
    case 'keyboard': {
      let value = 0;
      if (devices.keyboard.isHeld(binding.positive)) value += 1;
      if (devices.keyboard.isHeld(binding.negative)) value -= 1;
      return value;
    }
    case 'gamepad':
      if ('source' in binding) {
        return devices.gamepad.getAxisValue(binding.source);
      }
      {
        let value = 0;
        if (devices.gamepad.getDigitalState(binding.positive).held) value += 1;
        if (devices.gamepad.getDigitalState(binding.negative).held) value -= 1;
        return value;
      }
    case 'pointer':
      if (binding.source === 'wheelX') {
        return devices.pointer.getWheel().x;
      }
      return devices.pointer.getWheel().y;
  }
}

function applyBindingProcessors(
  raw: number,
  binding: BindingWithProcessors,
  defaultDeadZone: { inner: number; outer: number; mode: 'radial' | 'axial' },
  original: Axis1DBinding,
): number {
  const bindingProcessors = binding.processors;
  const isTrigger =
    original.device === 'gamepad' &&
    'source' in original &&
    (original.source === 'leftTrigger' || original.source === 'rightTrigger');

  const value = isTrigger ? Math.max(0, raw) : raw;

  if (bindingProcessors !== undefined && bindingProcessors.length > 0) {
    const result = applyProcessors({ x: value, y: 0 }, bindingProcessors, defaultDeadZone, false);
    return result.x;
  }

  if (original.device === 'gamepad') {
    const mode = 'axial';
    const result = applyProcessors({ x: value, y: 0 }, [], { ...defaultDeadZone, mode }, true);
    return result.x;
  }

  return value;
}
