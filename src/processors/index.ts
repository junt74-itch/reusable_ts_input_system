import type { ProcessorConfig, Vector2 } from '../core/types';
import { applyClamp } from './Clamp';
import { applyDeadZone } from './DeadZone';
import { applyInvert } from './Invert';
import { applyScale } from './Scale';

export function applyProcessors(
  v: Vector2,
  processors: ProcessorConfig[],
  defaultDeadZone: { inner: number; outer: number; mode: 'radial' | 'axial' },
  autoApplyDefaultDeadZone = false,
): Vector2 {
  let result = v;
  let deadZoneApplied = false;

  for (const processor of processors) {
    switch (processor.type) {
      case 'deadZone':
        result = applyDeadZone(
          result,
          processor.inner ?? defaultDeadZone.inner,
          processor.outer ?? defaultDeadZone.outer,
          processor.mode ?? defaultDeadZone.mode,
        );
        deadZoneApplied = true;
        break;
      case 'invert':
        result = applyInvert(result, processor.x ?? false, processor.y ?? false);
        break;
      case 'scale':
        result = applyScale(result, processor.factor);
        break;
      case 'clamp':
        result = applyClamp(result, processor.min ?? -1, processor.max ?? 1);
        break;
    }
  }

  if (autoApplyDefaultDeadZone && !deadZoneApplied) {
    result = applyDeadZone(
      result,
      defaultDeadZone.inner,
      defaultDeadZone.outer,
      defaultDeadZone.mode,
    );
  }

  return result;
}

export { applyDeadZone } from './DeadZone';
export { applyInvert } from './Invert';
export { applyScale } from './Scale';
export { applyClamp } from './Clamp';
