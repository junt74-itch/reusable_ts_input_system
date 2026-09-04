import type { Vector2 } from '../core/types';

export function applyInvert(v: Vector2, invertX: boolean, invertY: boolean): Vector2 {
  return {
    x: invertX ? -v.x : v.x,
    y: invertY ? -v.y : v.y,
  };
}
