import type { Vector2 } from '../core/types';

export function applyClamp(v: Vector2, min: number, max: number): Vector2 {
  return {
    x: clamp(v.x, min, max),
    y: clamp(v.y, min, max),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
