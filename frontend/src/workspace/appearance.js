import { applySystemAppearance, createSettingsAdapter } from '../platform/index.js';
import { createAppearanceStore, GLASS_APPEARANCE, REALISTIC_APPEARANCE } from '../storage/appearance.js';

export async function initializeAppearance(document) {
  const store = createAppearanceStore(createSettingsAdapter());
  const { body } = document;
  const controls = [...document.querySelectorAll('.appearance-toggle')];
  const status = document.getElementById('appearance-status');
  const themeColor = document.querySelector('meta[name=theme-color]');
  let current = GLASS_APPEARANCE;
  let stored;
  let pending = false;
  let noticeTimer;

  function sync(appearance) {
    current = appearance;
    const realistic = appearance === REALISTIC_APPEARANCE;
    body.dataset.appearance = appearance;
    themeColor.content = realistic ? '#121a23' : '#dce7ed';
    for (const control of controls) {
      control.setAttribute('aria-pressed', String(realistic));
      control.title = realistic ? '切换到玻璃外观' : '切换到写实外观';
      control.setAttribute('aria-label', control.title);
    }
    void applySystemAppearance(appearance).catch(error => console.warn('系统栏外观更新失败', error));
  }

  function showSaveError(error) {
    console.warn('外观设置保存失败', error);
    clearTimeout(noticeTimer);
    status.textContent = '暂时无法保存外观，请重试。';
    status.classList.add('visible');
    noticeTimer = setTimeout(() => status.classList.remove('visible'), 3500);
  }

  async function toggle() {
    if (pending) return;
    const target = current === GLASS_APPEARANCE ? REALISTIC_APPEARANCE : GLASS_APPEARANCE;
    pending = true;
    controls.forEach(control => control.setAttribute('aria-disabled', 'true'));
    try {
      // Retry a failed read before any change to the stored preference.
      stored ??= await store.read();
      if (target !== stored) await store.write(target);
      stored = target;
      status.classList.remove('visible');
      sync(target);
    } catch (error) {
      showSaveError(error);
    } finally {
      pending = false;
      controls.forEach(control => control.removeAttribute('aria-disabled'));
    }
  }

  try {
    stored = await store.read();
  } catch (error) {
    console.warn('外观设置读取失败', error);
  }
  sync(stored ?? GLASS_APPEARANCE);
  for (const control of controls) {
    control.addEventListener('click', toggle);
    control.disabled = false;
  }
  return current;
}
