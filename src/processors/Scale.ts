import type { Vector2 } from '../core/types';

export function applyScale(v: Vector2, factor: number): Vector2 {
  return { x: v.x * factor, y: v.y * factor };
}
