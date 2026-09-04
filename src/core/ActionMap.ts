import { Action } from './Action';
import { Axis1D } from './Axis1D';
import { Axis2D } from './Axis2D';
import type { NormalizedActionMapConfig } from './types';

export class ActionMap {
  readonly name: string;
  readonly actions = new Map<string, Action>();
  readonly axes1D = new Map<string, Axis1D>();
  readonly axes2D = new Map<string, Axis2D>();

  constructor(
    name: string,
    config: NormalizedActionMapConfig,
    defaultDeadZone: { inner: number; outer: number },
  ) {
    this.name = name;

    for (const [actionName, bindings] of Object.entries(config.actions)) {
      this.actions.set(actionName, new Action(bindings));
    }

    for (const [axisName, def] of Object.entries(config.axes1D)) {
      this.axes1D.set(axisName, new Axis1D(def, defaultDeadZone));
    }

    for (const [axisName, def] of Object.entries(config.axes2D)) {
      this.axes2D.set(axisName, new Axis2D(def, defaultDeadZone));
    }
  }

  deactivate(): void {
    for (const action of this.actions.values()) {
      action.deactivate();
    }
    for (const axis of this.axes1D.values()) {
      axis.deactivate();
    }
    for (const axis of this.axes2D.values()) {
      axis.deactivate();
    }
  }

  activate(devices: import('./Action').DeviceContext): void {
    for (const action of this.actions.values()) {
      action.activate(devices);
    }
    for (const axis of this.axes1D.values()) {
      axis.activate();
    }
    for (const axis of this.axes2D.values()) {
      axis.activate();
    }
  }
}
