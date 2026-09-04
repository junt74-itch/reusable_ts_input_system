import type { InputSystem, ActionState } from '../src/index';
import type { inputConfig } from './config';
import {
  GAMEPAD_BUTTONS,
  MAP_UI,
  PLAYABLE_MAPS,
  type PlayableMap,
} from './config';
import { EdgeGlowTracker } from './edgeTracker';

type DemoInput = InputSystem<typeof inputConfig>;

export interface DemoUI {
  update(input: DemoInput, glow: EdgeGlowTracker, now: number): void;
  setActiveMap(map: PlayableMap): void;
}

interface ActionRowElements {
  held: HTMLElement;
  pressed: HTMLElement;
  released: HTMLElement;
}

interface Axis1DElements {
  value: HTMLElement;
  fill: HTMLElement;
}

interface Axis2DElements {
  value: HTMLElement;
  dot: HTMLElement;
}

interface GamepadButtonElements {
  fill: HTMLElement;
}

interface PointerElements {
  posX: HTMLElement;
  posY: HTMLElement;
  deltaX: HTMLElement;
  deltaY: HTMLElement;
  wheelX: HTMLElement;
  wheelY: HTMLElement;
  primary: HTMLElement;
  secondary: HTMLElement;
}

export function createDemoUI(
  root: HTMLElement,
  onMapSwitch: (map: PlayableMap) => void,
): DemoUI {
  root.innerHTML = '';

  const header = document.createElement('header');
  header.className = 'app-header';
  root.appendChild(header);

  const titleBlock = document.createElement('div');
  const h1 = document.createElement('h1');
  h1.textContent = 'Input System Demo';
  titleBlock.appendChild(h1);
  const subtitle = document.createElement('p');
  subtitle.className = 'hint';
  subtitle.style.margin = '0';
  subtitle.textContent = 'Gamepad 診断 + Action Map 動作確認';
  titleBlock.appendChild(subtitle);
  header.appendChild(titleBlock);

  const statusGrid = document.createElement('div');
  statusGrid.className = 'status-grid';
  header.appendChild(statusGrid);

  const gpConnected = createStatusItem(statusGrid, 'Gamepad', '—');
  const gpId = createStatusItem(statusGrid, 'ID', '—');
  const gpIndex = createStatusItem(statusGrid, 'Index', '—');
  const currentDevice = createStatusItem(statusGrid, 'Current Device', '—');
  const activeMapEl = createStatusItem(statusGrid, 'Active Map', '—');

  const mapSwitch = document.createElement('div');
  mapSwitch.className = 'map-switch';
  root.appendChild(mapSwitch);

  const mapLabel = document.createElement('span');
  mapLabel.className = 'map-switch-label';
  mapLabel.textContent = 'Action Map:';
  mapSwitch.appendChild(mapLabel);

  const mapButtons = new Map<PlayableMap, HTMLButtonElement>();
  for (const map of PLAYABLE_MAPS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'map-btn';
    btn.textContent = MAP_UI[map].label;
    btn.addEventListener('click', () => {
      onMapSwitch(map);
    });
    mapSwitch.appendChild(btn);
    mapButtons.set(map, btn);
  }

  const layout = document.createElement('div');
  layout.className = 'layout';
  root.appendChild(layout);

  const leftCol = document.createElement('div');
  layout.appendChild(leftCol);

  const actionsPanel = createPanel(leftCol, 'Actions（現在の Map）');
  const actionsContainer = document.createElement('div');
  actionsPanel.appendChild(actionsContainer);

  const axesPanel = createPanel(leftCol, 'Axis（現在の Map）');
  const axesContainer = document.createElement('div');
  axesPanel.appendChild(axesContainer);

  const rightCol = document.createElement('div');
  layout.appendChild(rightCol);

  const gpPanel = createPanel(rightCol, 'Gamepad ボタン（論理名）');
  const gpButtonsContainer = document.createElement('div');
  gpButtonsContainer.className = 'gamepad-buttons';
  gpPanel.appendChild(gpButtonsContainer);

  const stickPanel = createPanel(rightCol, 'Gamepad スティック');
  const stickGrid = document.createElement('div');
  stickGrid.className = 'stick-panel';
  stickPanel.appendChild(stickGrid);

  const leftStick = createStickBlock(stickGrid, 'L Stick');
  const rightStick = createStickBlock(stickGrid, 'R Stick');

  const triggerPanel = createPanel(rightCol, 'Gamepad トリガー');
  const triggerContainer = document.createElement('div');
  triggerPanel.appendChild(triggerContainer);
  const leftTrigger = createAxis1DBlock(triggerContainer, 'leftTrigger');
  const rightTrigger = createAxis1DBlock(triggerContainer, 'rightTrigger');

  const pointerPanel = createPanel(rightCol, 'Pointer');
  const pointerGrid = document.createElement('div');
  pointerGrid.className = 'pointer-grid';
  pointerPanel.appendChild(pointerGrid);

  const pointerEls: PointerElements = {
    posX: createPointerRow(pointerGrid, 'Position X'),
    posY: createPointerRow(pointerGrid, 'Position Y'),
    deltaX: createPointerRow(pointerGrid, 'Delta X'),
    deltaY: createPointerRow(pointerGrid, 'Delta Y'),
    wheelX: createPointerRow(pointerGrid, 'Wheel X'),
    wheelY: createPointerRow(pointerGrid, 'Wheel Y'),
    primary: createPointerRow(pointerGrid, 'Primary'),
    secondary: createPointerRow(pointerGrid, 'Secondary'),
  };

  const hint = document.createElement('p');
  hint.className = 'hint';
  hint.textContent =
    'Tab キーで Action Map を切り替え。キーボード・ゲームパッド・マウスで入力してください。';
  root.appendChild(hint);

  const actionRows = new Map<string, ActionRowElements>();
  const axis1DRows = new Map<string, Axis1DElements>();
  const axis2DRows = new Map<string, Axis2DElements>();
  const gpButtonEls = new Map<string, GamepadButtonElements>();

  for (const button of GAMEPAD_BUTTONS) {
    const block = document.createElement('div');
    block.className = 'gp-btn';

    const name = document.createElement('span');
    name.className = 'gp-btn-name';
    name.textContent = button;
    block.appendChild(name);

    const bar = document.createElement('div');
    bar.className = 'gp-btn-bar';
    const fill = document.createElement('div');
    fill.className = 'gp-btn-fill';
    bar.appendChild(fill);
    block.appendChild(bar);

    gpButtonsContainer.appendChild(block);
    gpButtonEls.set(button, { fill });
  }

  let currentMap: PlayableMap = 'quiz';

  function rebuildMapUI(map: PlayableMap): void {
    currentMap = map;
    actionsContainer.replaceChildren();
    axesContainer.replaceChildren();
    actionRows.clear();
    axis1DRows.clear();
    axis2DRows.clear();

    const ui = MAP_UI[map];
    for (const name of ui.actions) {
      actionRows.set(name, createActionRow(actionsContainer, name));
    }
    for (const name of ui.axes2D) {
      axis2DRows.set(name, createAxis2DBlock(axesContainer, name));
    }
    for (const name of ui.axes1D) {
      axis1DRows.set(name, createAxis1DBlock(axesContainer, name));
    }

    for (const [key, btn] of mapButtons) {
      btn.classList.toggle('active', key === map);
    }
    activeMapEl.textContent = `${map} (${ui.label})`;
  }

  rebuildMapUI('quiz');

  return {
    setActiveMap(map: PlayableMap): void {
      rebuildMapUI(map);
    },
    update(input: DemoInput, glow: EdgeGlowTracker, now: number): void {
      const snap = input.gamepad;
      gpConnected.textContent = snap.connected ? 'Connected' : 'Disconnected';
      gpConnected.className = `status-value ${snap.connected ? 'connected' : 'disconnected'}`;
      gpId.textContent = snap.id || '—';
      gpIndex.textContent = snap.connected ? String(snap.index) : '—';
      currentDevice.textContent = input.currentDevice;

      const ui = MAP_UI[currentMap];
      for (const name of ui.actions) {
        const row = actionRows.get(name);
        if (row === undefined) continue;
        const state = input.action(name);
        updateActionRow(row, state, `action:${name}`, glow, now);
      }

      for (const name of ui.axes1D) {
        const row = axis1DRows.get(name);
        if (row === undefined) continue;
        updateAxis1D(row, input.axis1D(name).value);
      }

      for (const name of ui.axes2D) {
        const row = axis2DRows.get(name);
        if (row === undefined) continue;
        const v = input.axis2D(name).value;
        updateAxis2D(row, v.x, v.y);
      }

      for (const button of GAMEPAD_BUTTONS) {
        const els = gpButtonEls.get(button);
        if (els === undefined) continue;
        const actionName = `gp_${button}` as const;
        const held = input.action(actionName).isPressed();
        els.fill.style.width = held ? '100%' : '0%';
        els.fill.classList.toggle('held', held);
      }

      const left = input.axis2D('diagLeftStick').value;
      updateAxis2D(leftStick, left.x, left.y);
      const right = input.axis2D('diagRightStick').value;
      updateAxis2D(rightStick, right.x, right.y);

      updateAxis1D(leftTrigger, input.axis1D('diagLeftTrigger').value);
      updateAxis1D(rightTrigger, input.axis1D('diagRightTrigger').value);

      const ptr = input.pointer;
      pointerEls.posX.textContent = formatNum(ptr.position.x);
      pointerEls.posY.textContent = formatNum(ptr.position.y);
      pointerEls.deltaX.textContent = formatNum(ptr.delta.x);
      pointerEls.deltaY.textContent = formatNum(ptr.delta.y);
      pointerEls.wheelX.textContent = formatNum(ptr.wheel.x);
      pointerEls.wheelY.textContent = formatNum(ptr.wheel.y);

      pointerEls.primary.textContent = input.action('ptr_primary').isPressed() ? 'pressed' : '—';
      pointerEls.secondary.textContent = input.action('ptr_secondary').isPressed() ? 'pressed' : '—';
    },
  };
}

function createPanel(parent: HTMLElement, title: string): HTMLElement {
  const panel = document.createElement('section');
  panel.className = 'panel';
  const h2 = document.createElement('h2');
  h2.textContent = title;
  panel.appendChild(h2);
  parent.appendChild(panel);
  return panel;
}

function createStatusItem(
  parent: HTMLElement,
  label: string,
  value: string,
): HTMLElement {
  const item = document.createElement('div');
  item.className = 'status-item';
  const lbl = document.createElement('span');
  lbl.className = 'status-label';
  lbl.textContent = label;
  item.appendChild(lbl);
  const val = document.createElement('span');
  val.className = 'status-value';
  val.textContent = value;
  item.appendChild(val);
  parent.appendChild(item);
  return val;
}

function createActionRow(parent: HTMLElement, name: string): ActionRowElements {
  const row = document.createElement('div');
  row.className = 'action-row';

  const nameEl = document.createElement('span');
  nameEl.className = 'action-name';
  nameEl.textContent = name;
  row.appendChild(nameEl);

  const lights = document.createElement('div');
  lights.className = 'edge-lights';

  const held = createEdgeLight(lights, 'Held');
  const pressed = createEdgeLight(lights, 'Pressed');
  const released = createEdgeLight(lights, 'Released');

  row.appendChild(lights);
  parent.appendChild(row);

  return { held, pressed, released };
}

function createEdgeLight(parent: HTMLElement, label: string): HTMLElement {
  const el = document.createElement('div');
  el.className = 'edge-light';
  const lbl = document.createElement('span');
  lbl.className = 'edge-light-label';
  lbl.textContent = label;
  el.appendChild(lbl);
  parent.appendChild(el);
  return el;
}

function createAxis1DBlock(parent: HTMLElement, name: string): Axis1DElements {
  const block = document.createElement('div');
  block.className = 'axis-block';

  const header = document.createElement('div');
  header.className = 'axis-header';
  const nameEl = document.createElement('span');
  nameEl.className = 'axis-name';
  nameEl.textContent = name;
  header.appendChild(nameEl);
  const value = document.createElement('span');
  value.className = 'axis-value';
  value.textContent = '0.000';
  header.appendChild(value);
  block.appendChild(header);

  const track = document.createElement('div');
  track.className = 'bar-track';
  const fill = document.createElement('div');
  fill.className = 'bar-fill';
  fill.style.left = '50%';
  fill.style.width = '0%';
  track.appendChild(fill);
  block.appendChild(track);

  parent.appendChild(block);
  return { value, fill };
}

function createAxis2DBlock(parent: HTMLElement, name: string): Axis2DElements {
  const block = document.createElement('div');
  block.className = 'axis-block';

  const header = document.createElement('div');
  header.className = 'axis-header';
  const nameEl = document.createElement('span');
  nameEl.className = 'axis-name';
  nameEl.textContent = name;
  header.appendChild(nameEl);
  const value = document.createElement('span');
  value.className = 'axis-value';
  value.textContent = '(0.000, 0.000)';
  header.appendChild(value);
  block.appendChild(header);

  const visual = document.createElement('div');
  visual.className = 'stick-visual';
  const dot = document.createElement('div');
  dot.className = 'stick-dot';
  visual.appendChild(dot);
  block.appendChild(visual);

  parent.appendChild(block);
  return { value, dot };
}

function createStickBlock(parent: HTMLElement, title: string): Axis2DElements {
  const block = document.createElement('div');
  block.className = 'stick-block';
  const h3 = document.createElement('h3');
  h3.textContent = title;
  block.appendChild(h3);

  const values = document.createElement('div');
  values.className = 'stick-values';
  block.appendChild(values);

  const visual = document.createElement('div');
  visual.className = 'stick-visual';
  const dot = document.createElement('div');
  dot.className = 'stick-dot';
  visual.appendChild(dot);
  block.appendChild(visual);

  parent.appendChild(block);
  return { value: values, dot };
}

function createPointerRow(parent: HTMLElement, label: string): HTMLElement {
  const lbl = document.createElement('span');
  lbl.className = 'pointer-label';
  lbl.textContent = label;
  parent.appendChild(lbl);
  const val = document.createElement('span');
  val.textContent = '—';
  parent.appendChild(val);
  return val;
}

function updateActionRow(
  row: ActionRowElements,
  state: ActionState,
  glowId: string,
  glow: EdgeGlowTracker,
  now: number,
): void {
  const isHeld = state.isPressed();
  const wasPressed = state.wasPressed();
  const wasReleased = state.wasReleased();

  glow.record(glowId, wasPressed, wasReleased, now);

  const pressedGlow = glow.pressedGlow(glowId, now);
  const releasedGlow = glow.releasedGlow(glowId, now);

  row.held.classList.toggle('on-held', isHeld);
  row.pressed.classList.toggle('on-pressed', wasPressed || pressedGlow > 0);
  row.pressed.style.opacity = wasPressed ? '1' : String(0.3 + pressedGlow * 0.7);
  row.released.classList.toggle('on-released', wasReleased || releasedGlow > 0);
  row.released.style.opacity = wasReleased ? '1' : String(0.3 + releasedGlow * 0.7);
}

function updateAxis1D(els: Axis1DElements, value: number): void {
  els.value.textContent = formatNum(value);
  const pct = Math.min(Math.abs(value) * 50, 50);
  if (value >= 0) {
    els.fill.style.left = '50%';
    els.fill.style.width = `${pct}%`;
  } else {
    els.fill.style.left = `${50 - pct}%`;
    els.fill.style.width = `${pct}%`;
  }
}

function updateAxis2D(els: Axis2DElements, x: number, y: number): void {
  els.value.textContent = `(${formatNum(x)}, ${formatNum(y)})`;
  const px = 50 + x * 42;
  const py = 50 - y * 42;
  els.dot.style.left = `${px}%`;
  els.dot.style.top = `${py}%`;
}

function formatNum(n: number): string {
  return n.toFixed(3);
}
