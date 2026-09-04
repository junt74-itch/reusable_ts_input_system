import { createInputSystem } from '../src/index';
import { inputConfig, PLAYABLE_MAPS, type PlayableMap } from './config';
import { EdgeGlowTracker } from './edgeTracker';
import { createDemoUI } from './ui';

const root = document.querySelector<HTMLElement>('#app');
if (root === null) {
  throw new Error('#app element not found');
}

const input = createInputSystem(inputConfig);
const glow = new EdgeGlowTracker();

let activeMap: PlayableMap = 'quiz';

function switchMap(map: PlayableMap): void {
  if (map === activeMap) {
    return;
  }
  activeMap = map;
  input.activateMap(map);
  ui.setActiveMap(map);
}

const ui = createDemoUI(root, switchMap);

window.addEventListener('keydown', (event) => {
  if (event.code === 'Tab') {
    event.preventDefault();
    const idx = PLAYABLE_MAPS.indexOf(activeMap);
    const next = PLAYABLE_MAPS[(idx + 1) % PLAYABLE_MAPS.length];
    if (next !== undefined) {
      switchMap(next);
    }
  }
});

function frame(now: number): void {
  input.update();
  ui.update(input, glow, now);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
