import { createLineup } from '../../../shared/lineups.js';
import { APPEARANCE_KEY, GLASS_APPEARANCE, REALISTIC_APPEARANCE } from '../../src/storage/appearance.js';
import { emptyLineupState, LINEUPS_KEY } from '../../src/storage/lineups.js';

const lockerMode = new URLSearchParams(window.location.search).get('locker');
if (lockerMode === 'unified') document.title = '球搭 · 三页与单人编辑原型';
if (lockerMode === 'card-swipe') {
  document.title = '球搭 · 整张更衣室卡片滑动原型';
}
const layoutPreview = lockerMode === 'layout';
const controlsPreview = lockerMode === 'controls';
const playerCardPreview = layoutPreview || controlsPreview || lockerMode === 'player-card' || lockerMode === 'no-player-card';
if (lockerMode === 'swipe' || playerCardPreview) {
  document.body.dataset.lockerPreview = 'swipe';
  document.title = playerCardPreview ? '球搭 · 球员名片原型' : '球搭 · 更衣室滑动原型';
  if (layoutPreview) {
    document.body.dataset.lockerLayout = 'three-part';
    document.title = '球搭 · 更衣室排版原型';
  }
  if (controlsPreview) {
    document.body.dataset.lockerControlsPreview = 'true';
    document.title = '球搭 · 更衣室文字和按钮原型';
  }
  await import('./locker-swipe.css');

  const panel = document.querySelector('#lineups-panel');
  const updateScene = () => {
    const scene = panel.querySelector('.locker-scene');
    if (!scene) return;
    scene.setAttribute('aria-label', '更衣室，左右滑动切换球员');
    scene.querySelector('.locker-dots').inert = true;
  };
  new MutationObserver(updateScene).observe(panel, { childList: true, subtree: true });
  updateScene();
}

if (playerCardPreview) {
  document.body.dataset.playerCardPreview = lockerMode === 'player-card' ? 'compact' : 'hidden';
  const updateLabels = () => {
    const edit = document.querySelector('#lineups-panel .lineup-profile-actions [data-action="lineup-configure"]');
    if (edit?.textContent === '配置球员') edit.textContent = '编辑球员';
    const title = document.querySelector('#lineup-wizard-dialog [data-player-config="true"] #lineup-wizard-title');
    if (title?.textContent === '配置球员') title.textContent = '编辑球员资料';
    if (controlsPreview) {
      const status = document.querySelector('#lineups-panel .lineup-profile-title p');
      const suffix = ' · 当前球队';
      if (status?.textContent.endsWith(suffix)) status.textContent = status.textContent.slice(0, -suffix.length);
    }
  };
  new MutationObserver(updateLabels).observe(document.body, { childList: true, subtree: true });
  updateLabels();
}

const preferenceKey = 'hoopal-appearance-preview';
let storage;
try { storage = window.localStorage; } catch { /* The preview can run without durable browser storage. */ }
function readAppearance() {
  try {
    return storage?.getItem(preferenceKey) === GLASS_APPEARANCE ? GLASS_APPEARANCE : REALISTIC_APPEARANCE;
  } catch {
    return REALISTIC_APPEARANCE;
  }
}

const samples = [
  { id: 'preview-three', name: '周末三人队', mode: '3v3', names: ['阿杰', '小林', '老周'], numbers: [1, 11, 23] },
  { id: 'preview-four', name: '周末四人队', mode: '4v4', names: ['阿杰', '老周', '小林', '阿凯'], numbers: [7, 23, 11, 30] },
];
const profiles = samples.map(({ id, name, mode, names, numbers }) => {
  const lineup = createLineup(mode, { id, name, color: 'green', nbaTeamId: 'BOS' });
  lineup.players.forEach((player, index) => {
    player.name = names[index];
    player.number = numbers[index];
    if ((playerCardPreview || lockerMode === 'unified' || lockerMode === 'card-swipe') && index === 0) player.mainRole = 'start';
  });
  return lineup;
});
const seed = { ...emptyLineupState(), profiles, activeProfileId: profiles[0].id };
const demoStorage = new Map([[LINEUPS_KEY, JSON.stringify(seed)], [APPEARANCE_KEY, readAppearance()]]);
// The normal app code runs with fixture data. Its writes last until reload.
Object.defineProperty(window, 'localStorage', {
  configurable: true,
  value: {
    get length() { return demoStorage.size; },
    key(index) { return Array.from(demoStorage.keys())[index] ?? null; },
    getItem(key) { return demoStorage.get(key) ?? null; },
    setItem(key, value) {
      demoStorage.set(String(key), String(value));
      if (key === APPEARANCE_KEY) {
        try { storage?.setItem(preferenceKey, value); } catch { /* The preview still works in memory. */ }
      }
    },
    removeItem(key) { demoStorage.delete(key); },
  },
});

const { startup } = await import('../../src/startup/runtime.js');
startup.skip();
await import('../../src/main.js');
