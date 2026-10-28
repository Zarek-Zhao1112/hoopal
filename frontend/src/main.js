import { startup } from './startup/runtime.js';

// Mount the brand before local reads, then reveal the real rendered destination.
try {
  await import('./app.js');
  document.body.dataset.appReady = 'true';
  await startup.ready();
} catch (error) {
  console.error('球搭启动失败', error);
  startup.fail(error);
}
