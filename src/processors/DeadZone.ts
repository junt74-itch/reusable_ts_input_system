import type { Vector2 } from '../core/types';

export function applyDeadZone(
  v: Vector2,
  inner: number,
  outer: number,
  mode: 'radial' | 'axial',
): Vector2 {
  if (mode === 'radial') {
    return applyRadialDeadZone(v, inner, outer);
  }
  return applyAxialDeadZone(v, inner, outer);
}

function applyRadialDeadZone(v: Vector2, inner: number, outer: number): Vector2 {
  const magnitude = Math.hypot(v.x, v.y);
  if (magnitude <= inner) {
    return { x: 0, y: 0 };
  }
  if (magnitude >= outer) {
    const scale = 1 / magnitude;
    return { x: v.x * scale, y: v.y * scale };
  }
  const remapped = remapMagnitude(magnitude, inner, outer);
  const scale = remapped / magnitude;
  return { x: v.x * scale, y: v.y * scale };
}

function applyAxialDeadZone(v: Vector2, inner: number, outer: number): Vector2 {
  return {
    x: remapAxisComponent(v.x, inner, outer),
    y: remapAxisComponent(v.y, inner, outer),
  };
}

function remapAxisComponent(value: number, inner: number, outer: number): number {
  const abs = Math.abs(value);
  if (abs <= inner) {
    return 0;
  }
  if (abs >= outer) {
    return Math.sign(value);
  }
  const remapped = remapMagnitude(abs, inner, outer);
  return Math.sign(value) * remapped;
}

function remapMagnitude(magnitude: number, inner: number, outer: number): number {
  return (magnitude - inner) / (outer - inner);
}
