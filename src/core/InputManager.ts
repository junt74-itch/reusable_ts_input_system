import { createActionFacade } from './Action';
import { ActionMap } from './ActionMap';
import {
  getInitialMapName,
  normalizeActionMapConfig,
  resolveOptions,
} from './Binding';
import type {
  ActionName,
  ActionState,
  Axis1DName,
  Axis1DState,
  Axis2DName,
  Axis2DState,
  DeviceKind,
  InputConfig,
  InputSystem,
  InputSystemOptions,
  MapName,
  ResolvedOptions,
} from './types';
import { createAxis1DFacade } from './Axis1D';
import { createAxis2DFacade } from './Axis2D';
import { KeyboardDevice } from '../devices/KeyboardDevice';
import { GamepadDevice } from '../devices/GamepadDevice';
import { PointerDevice } from '../devices/PointerDevice';
import type { DeviceContext } from './Action';

class InputManager<C extends InputConfig> implements InputSystem<C> {
  private readonly options: ResolvedOptions;
  private readonly maps = new Map<string, ActionMap>();
  private readonly allActionNames = new Set<string>();
  private readonly allAxis1DNames = new Set<string>();
  private readonly allAxis2DNames = new Set<string>();
  private readonly actionFacades = new Map<string, ActionState>();
  private readonly axis1DFacades = new Map<string, Axis1DState>();
  private readonly axis2DFacades = new Map<string, Axis2DState>();

  private readonly keyboardDevice: KeyboardDevice;
  private readonly gamepadDevice: GamepadDevice;
  private readonly pointerDevice: PointerDevice;

  private activeMapName: string;
  private activeMapInstance: ActionMap;
  private currentDeviceKind: DeviceKind;
  private disposed = false;
  private attached = false;

  private readonly pointerSnapshot = {
    position: { x: 0, y: 0 },
    delta: { x: 0, y: 0 },
    wheel: { x: 0, y: 0 },
  };

  constructor(config: C, options?: InputSystemOptions) {
    this.options = resolveOptions(options);

    const defaultDeadZone = {
      inner: this.options.deadZoneInner,
      outer: this.options.deadZoneOuter,
    };

    for (const [mapName, mapConfig] of Object.entries(config.maps)) {
      const normalized = normalizeActionMapConfig(mapConfig);
      const map = new ActionMap(mapName, normalized, defaultDeadZone);
      this.maps.set(mapName, map);

      for (const actionName of map.actions.keys()) {
        this.allActionNames.add(actionName);
      }
      for (const axisName of map.axes1D.keys()) {
        this.allAxis1DNames.add(axisName);
      }
      for (const axisName of map.axes2D.keys()) {
        this.allAxis2DNames.add(axisName);
      }
    }

    for (const actionName of this.allActionNames) {
      this.actionFacades.set(
        actionName,
        createActionFacade(() => this.activeMapInstance.actions.get(actionName)),
      );
    }
    for (const axisName of this.allAxis1DNames) {
      this.axis1DFacades.set(
        axisName,
        createAxis1DFacade(() => this.activeMapInstance.axes1D.get(axisName)),
      );
    }
    for (const axisName of this.allAxis2DNames) {
      this.axis2DFacades.set(
        axisName,
        createAxis2DFacade(() => this.activeMapInstance.axes2D.get(axisName)),
      );
    }

    this.keyboardDevice = new KeyboardDevice(config, this.options);
    this.gamepadDevice = new GamepadDevice(this.options);
    this.pointerDevice = new PointerDevice(this.options);

    this.currentDeviceKind = this.options.initialDevice;

    const initialMap = getInitialMapName(config);
    this.activeMapName = initialMap;
    const initialMapInstance = this.maps.get(initialMap);
    if (initialMapInstance === undefined) {
      throw new Error(`Unknown initial map: ${initialMap}`);
    }
    this.activeMapInstance = initialMapInstance;

    for (const map of this.maps.values()) {
      if (map !== initialMapInstance) {
        map.deactivate();
      }
    }

    initialMapInstance.activate(this.deviceContext);

    if (this.options.autoAttach) {
      this.attach();
    }
  }

  get activeMap(): MapName<C> {
    return this.activeMapName as MapName<C>;
  }

  get currentDevice(): DeviceKind {
    return this.currentDeviceKind;
  }

  get pointer() {
    return this.pointerSnapshot;
  }

  get gamepad() {
    return this.gamepadDevice.getSnapshot();
  }

  get devices() {
    return {
      keyboard: this.keyboardDevice,
      gamepad: this.gamepadDevice,
      pointer: this.pointerDevice,
    };
  }

  private get deviceContext(): DeviceContext {
    return {
      keyboard: this.keyboardDevice,
      gamepad: this.gamepadDevice,
      pointer: this.pointerDevice,
    };
  }

  update(): void {
    if (this.disposed) {
      return;
    }

    this.keyboardDevice.poll();
    this.gamepadDevice.poll();
    this.pointerDevice.poll();

    this.detectCurrentDevice();

    for (const action of this.activeMapInstance.actions.values()) {
      action.resolve(this.deviceContext);
    }
    for (const axis of this.activeMapInstance.axes1D.values()) {
      axis.resolve(this.deviceContext);
    }
    for (const axis of this.activeMapInstance.axes2D.values()) {
      axis.resolve(this.deviceContext);
    }

    const pos = this.pointerDevice.getPosition();
    const delta = this.pointerDevice.getDelta();
    const wheel = this.pointerDevice.getWheel();
    this.pointerSnapshot.position.x = pos.x;
    this.pointerSnapshot.position.y = pos.y;
    this.pointerSnapshot.delta.x = delta.x;
    this.pointerSnapshot.delta.y = delta.y;
    this.pointerSnapshot.wheel.x = wheel.x;
    this.pointerSnapshot.wheel.y = wheel.y;

    this.keyboardDevice.endFrame();
    this.gamepadDevice.endFrame();
    this.pointerDevice.endFrame();
  }

  action(name: ActionName<C>): ActionState {
    this.assertKnownAction(name);
    const state = this.actionFacades.get(name);
    if (state === undefined) {
      throw new Error(`Unknown action: ${name}`);
    }
    return state;
  }

  axis1D(name: Axis1DName<C>): Axis1DState {
    this.assertKnownAxis1D(name);
    const state = this.axis1DFacades.get(name);
    if (state === undefined) {
      throw new Error(`Unknown axis1D: ${name}`);
    }
    return state;
  }

  axis2D(name: Axis2DName<C>): Axis2DState {
    this.assertKnownAxis2D(name);
    const state = this.axis2DFacades.get(name);
    if (state === undefined) {
      throw new Error(`Unknown axis2D: ${name}`);
    }
    return state;
  }

  activateMap(name: MapName<C>): void {
    if (!this.maps.has(name)) {
      throw new Error(`Unknown map: ${name}`);
    }
    if (name === this.activeMapName) {
      return;
    }

    this.activeMapInstance.deactivate();

    const newMap = this.maps.get(name);
    if (newMap === undefined) {
      throw new Error(`Unknown map: ${name}`);
    }

    this.activeMapName = name;
    this.activeMapInstance = newMap;
    newMap.activate(this.deviceContext);
  }

  attach(): void {
    if (this.attached || this.disposed) {
      return;
    }
    this.attached = true;
    this.keyboardDevice.attach();
    this.gamepadDevice.attach();
    this.pointerDevice.attach();
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.detachInternal();
    this.keyboardDevice.markDisposed();
    this.pointerDevice.markDisposed();
    this.activeMapInstance.deactivate();
  }

  private detachInternal(): void {
    if (!this.attached) {
      return;
    }
    this.attached = false;
    this.keyboardDevice.detach();
    this.gamepadDevice.detach();
    this.pointerDevice.detach();
  }

  private assertKnownAction(name: string): void {
    if (!this.allActionNames.has(name)) {
      throw new Error(`Unknown action: ${name}`);
    }
  }

  private assertKnownAxis1D(name: string): void {
    if (!this.allAxis1DNames.has(name)) {
      throw new Error(`Unknown axis1D: ${name}`);
    }
  }

  private assertKnownAxis2D(name: string): void {
    if (!this.allAxis2DNames.has(name)) {
      throw new Error(`Unknown axis2D: ${name}`);
    }
  }

  private detectCurrentDevice(): void {
    let gamepadActive = false;
    let keyboardActive = false;
    let pointerActive = false;

    if (this.gamepadDevice.hasAnyPressedThisFrame() || this.gamepadDevice.hasSignificantAxisInput()) {
      gamepadActive = true;
    }
    if (this.keyboardDevice.hasAnyPressedThisFrame()) {
      keyboardActive = true;
    }
    if (this.pointerDevice.hasAnyPressedThisFrame() || this.pointerDevice.hasWheelInput()) {
      pointerActive = true;
    }

    if (gamepadActive) {
      this.currentDeviceKind = 'gamepad';
    } else if (keyboardActive) {
      this.currentDeviceKind = 'keyboard';
    } else if (pointerActive) {
      this.currentDeviceKind = 'pointer';
    }
  }
}

export function createInputSystem<C extends InputConfig>(
  config: C,
  options?: InputSystemOptions,
): InputSystem<C> {
  return new InputManager(config, options);
}
