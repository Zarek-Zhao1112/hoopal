import { startup } from './startup/runtime.js';
import { initializeAppearance } from './workspace/appearance.js';
import { REALISTIC_APPEARANCE } from './storage/appearance.js';

// Mount the brand before local reads, then reveal the real rendered destination.
try {
  const appearance = await initializeAppearance(document);
  // The glass intro expands a single cabinet. The realistic room is already a full scene.
  if (appearance === REALISTIC_APPEARANCE) startup.skip();
  await import('./app.js');
  document.body.dataset.appReady = 'true';
  await startup.ready();
} catch (error) {
  console.error('球搭启动失败', error);
  startup.fail(error);
}
