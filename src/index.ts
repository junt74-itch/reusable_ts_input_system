export {
  createInputSystem,
} from './core/InputManager';

export {
  defineInputConfig,
  key,
  pad,
  mouse,
  keyAxis1D,
  keyAxis2D,
  stick,
  dpad,
} from './core/Binding';

export type {
  InputConfig,
  InputSystemOptions,
  InputSystem,
  ActionState,
  Axis1DState,
  Axis2DState,
  ButtonBinding,
  Axis1DBinding,
  Axis2DBinding,
  ProcessorConfig,
  ActionMapConfig,
  Axis1DDefinition,
  Axis2DDefinition,
  DeviceKind,
  GamepadButtonName,
  GamepadAxis1DSource,
  PointerButtonName,
  Vector2,
  GamepadLike,
  PointerSnapshot,
  GamepadSnapshot,
  InputDevices,
  MapName,
  ActionName,
  Axis1DName,
  Axis2DName,
} from './core/types';
