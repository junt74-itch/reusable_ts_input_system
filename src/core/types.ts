import type { KeyboardDevice } from '../devices/KeyboardDevice';
import type { GamepadDevice } from '../devices/GamepadDevice';
import type { PointerDevice } from '../devices/PointerDevice';

export type DeviceKind = 'keyboard' | 'gamepad' | 'pointer';

export type GamepadButtonName =
  | 'south'
  | 'east'
  | 'west'
  | 'north'
  | 'leftShoulder'
  | 'rightShoulder'
  | 'leftTrigger'
  | 'rightTrigger'
  | 'select'
  | 'start'
  | 'leftStick'
  | 'rightStick'
  | 'dpadUp'
  | 'dpadDown'
  | 'dpadLeft'
  | 'dpadRight';

export type GamepadAxis1DSource =
  | 'leftStickX'
  | 'leftStickY'
  | 'rightStickX'
  | 'rightStickY'
  | 'leftTrigger'
  | 'rightTrigger';

export type PointerButtonName = 'primary' | 'middle' | 'secondary';

export type ButtonBinding =
  | { device: 'keyboard'; code: string }
  | { device: 'gamepad'; button: GamepadButtonName }
  | { device: 'pointer'; button: PointerButtonName };

export type Axis1DBinding =
  | { device: 'keyboard'; negative: string; positive: string }
  | { device: 'gamepad'; source: GamepadAxis1DSource }
  | { device: 'gamepad'; negative: GamepadButtonName; positive: GamepadButtonName }
  | { device: 'pointer'; source: 'wheelX' | 'wheelY' };

export type Axis2DBinding =
  | { device: 'keyboard'; up: string; down: string; left: string; right: string }
  | { device: 'gamepad'; source: 'leftStick' | 'rightStick' | 'dpad' }
  | { device: 'pointer'; source: 'position' | 'delta' };

export type ProcessorConfig =
  | { type: 'deadZone'; inner?: number; outer?: number; mode?: 'radial' | 'axial' }
  | { type: 'invert'; x?: boolean; y?: boolean }
  | { type: 'scale'; factor: number }
  | { type: 'clamp'; min?: number; max?: number };

export interface Axis1DDefinition {
  bindings: readonly Axis1DBinding[];
  processors?: readonly ProcessorConfig[];
}

export interface Axis2DDefinition {
  bindings: readonly Axis2DBinding[];
  processors?: readonly ProcessorConfig[];
  normalize?: boolean;
}

export interface ActionMapConfig {
  actions?: Record<string, readonly ButtonBinding[]>;
  axes1D?: Record<string, readonly Axis1DBinding[] | Axis1DDefinition>;
  axes2D?: Record<string, readonly Axis2DBinding[] | Axis2DDefinition>;
}

export interface InputConfig {
  maps: Record<string, ActionMapConfig>;
  initialMap?: string;
}

export interface InputSystemOptions {
  keyboardTarget?: EventTarget;
  pointerTarget?: EventTarget;
  autoAttach?: boolean;
  preventDefault?: boolean;
  gamepadSource?: () => ArrayLike<GamepadLike | null>;
  gamepadIndex?: number;
  deadZone?: { inner?: number; outer?: number };
  triggerThreshold?: number;
  deviceSwitchThreshold?: number;
  initialDevice?: DeviceKind;
}

export interface GamepadLike {
  index: number;
  id: string;
  mapping: string;
  connected: boolean;
  buttons: ReadonlyArray<{ value: number; pressed: boolean }>;
  axes: ReadonlyArray<number>;
}

export interface Vector2 {
  readonly x: number;
  readonly y: number;
}

export interface ActionState {
  isPressed(): boolean;
  wasPressed(): boolean;
  wasReleased(): boolean;
}

export interface Axis1DState {
  readonly value: number;
}

export interface Axis2DState {
  readonly value: Readonly<Vector2>;
}

export interface PointerSnapshot {
  readonly position: Readonly<Vector2>;
  readonly delta: Readonly<Vector2>;
  readonly wheel: Readonly<Vector2>;
}

export interface GamepadSnapshot {
  readonly connected: boolean;
  readonly id: string;
  readonly index: number;
}

export interface InputDevices {
  readonly keyboard: KeyboardDevice;
  readonly gamepad: GamepadDevice;
  readonly pointer: PointerDevice;
}

export interface InputSystem<C extends InputConfig = InputConfig> {
  update(): void;
  action(name: ActionName<C>): ActionState;
  axis1D(name: Axis1DName<C>): Axis1DState;
  axis2D(name: Axis2DName<C>): Axis2DState;
  activateMap(name: MapName<C>): void;
  readonly activeMap: MapName<C>;
  readonly currentDevice: DeviceKind;
  readonly pointer: PointerSnapshot;
  readonly gamepad: GamepadSnapshot;
  readonly devices: InputDevices;
  attach(): void;
  dispose(): void;
}

// --- 型推論ユーティリティ ---

type UnionToIntersection<U> = (U extends unknown ? (k: U) => void : never) extends (
  k: infer I,
) => void
  ? I
  : never;

type AllMaps<C extends InputConfig> = C['maps'][keyof C['maps']];

export type MapName<C extends InputConfig> = keyof C['maps'] & string;

export type ActionName<C extends InputConfig> = {
  [K in keyof C['maps']]: keyof NonNullable<C['maps'][K]['actions']> & string;
}[keyof C['maps']];

export type Axis1DName<C extends InputConfig> = {
  [K in keyof C['maps']]: keyof NonNullable<C['maps'][K]['axes1D']> & string;
}[keyof C['maps']];

export type Axis2DName<C extends InputConfig> = {
  [K in keyof C['maps']]: keyof NonNullable<C['maps'][K]['axes2D']> & string;
}[keyof C['maps']];

export type ResolvedOptions = {
  keyboardTarget: EventTarget;
  pointerTarget: EventTarget;
  autoAttach: boolean;
  preventDefault: boolean;
  gamepadSource: () => ArrayLike<GamepadLike | null>;
  gamepadIndex: number | undefined;
  deadZoneInner: number;
  deadZoneOuter: number;
  triggerThreshold: number;
  deviceSwitchThreshold: number;
  initialDevice: DeviceKind;
};

export type NormalizedAxis1DDefinition = {
  bindings: readonly Axis1DBinding[];
  processors: ProcessorConfig[];
};

export type NormalizedAxis2DDefinition = {
  bindings: readonly Axis2DBinding[];
  processors: ProcessorConfig[];
  normalize: boolean;
};

export type NormalizedActionMapConfig = {
  actions: Record<string, readonly ButtonBinding[]>;
  axes1D: Record<string, NormalizedAxis1DDefinition>;
  axes2D: Record<string, NormalizedAxis2DDefinition>;
};

export type BindingDigitalState = {
  held: boolean;
  pressedThisFrame: boolean;
  releasedThisFrame: boolean;
};

export type { AllMaps, UnionToIntersection };
