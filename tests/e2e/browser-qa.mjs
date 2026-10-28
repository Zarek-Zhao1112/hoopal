import { spawn } from 'node:child_process';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import path from 'node:path';
import { createAppServer } from '../../backend/app.mjs';
import { templates } from '../../shared/templates.js';
import { runReadOnlyFlow } from './readonly-flow.mjs';
import { runLineupFlow } from './lineup-flow.mjs';
import { runPageMotionFlow } from './page-motion-flow.mjs';
import { runLibraryDeckFlow } from './library-deck-flow.mjs';
import { runGlassSheetFlow } from './glass-sheet-flow.mjs';
import { runPageLayoutFlow } from './page-layout-flow.mjs';
import { runTeamCarouselFlow } from './team-carousel-flow.mjs';
import { runOffenseExpansionFlow } from './offense-expansion-flow.mjs';
import { runInlinePreviewFlow } from './inline-preview-flow.mjs';
import { runArchivesFlow } from './archives-flow.mjs';
import { runCreationMotionFlow } from './creation-motion-flow.mjs';
import { runLockerFrameFlow } from './locker-frame-flow.mjs';
import { runStartupFlow } from './startup-flow.mjs';

const folder = fileURLToPath(new URL('../../artifacts/qa/', import.meta.url));
await mkdir(folder, { recursive: true });
const webServer = createAppServer();
await new Promise((resolve, reject) => { webServer.once('error', reject); webServer.listen(0, '127.0.0.1', resolve); });
const appOrigin = `http://127.0.0.1:${webServer.address().port}`;
const executable = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const profile = path.join(folder, `profile-${Date.now()}`);
const browser = spawn(executable, ['--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--remote-debugging-port=9227', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
let connection;
try {
  let targets;
  for (let i = 0; i < 50; i++) {
    try { targets = await (await fetch('http://127.0.0.1:9227/json/list')).json(); break; } catch { await wait(150); }
  }
  assert.ok(targets, 'Chrome debugging connection starts');
  connection = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { connection.onopen = resolve; connection.onerror = reject; });
  let sequence = 0;
  const pending = new Map(), errors = [], remoteRequests = [];
  connection.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.method === 'Network.requestWillBeSent') {
      const url = message.params.request.url;
      if (/^https?:/.test(url) && !url.startsWith(appOrigin + '/')) remoteRequests.push(url);
    }
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
    if (message.id) {
      const promise = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) promise.reject(new Error(message.error.message)); else promise.resolve(message.result);
    }
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    connection.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    const response = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true });
    if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
    return response.result.value;
  };
  const waitFor = async expression => {
    for (let i = 0; i < 100; i++) {
      if (await evaluate(expression) && await evaluate("!document.body?.classList.contains('startup-active')")) return;
      await wait(50);
    }
    console.log('Browser wait diagnostics:', { errors, state: await evaluate("({title:document.querySelector('#play-title')?.value,playing:document.querySelector('#play-toggle')?.getAttribute('aria-pressed'),progress:document.querySelector('#timeline-scrub')?.value,visibility:document.visibilityState,loading:document.body.classList.contains('is-loading')})") });
    throw new Error(`Browser condition timed out: ${expression}`);
  };
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: appOrigin });
  await send('Page.bringToFront');
  await send('Emulation.setFocusEmulationEnabled', { enabled: true });
  await waitFor("document.body.dataset.appReady==='true'&&!document.getElementById('startup-screen')");
  for (let i = 0; i < 40; i++) {
    if (await evaluate("Boolean(document.querySelector('#players-layer [data-player]'))")) break;
    await wait(100);
  }
  if (errors.length) console.log('Browser startup errors:', errors);
  assert.equal(await evaluate("document.querySelectorAll('#players-layer [data-player]').length"), 6, '3v3 roster renders');
  assert.equal(await evaluate("document.querySelectorAll('#frame-list button').length"), 4, 'example has four animation steps');
  assert.equal(await evaluate("document.querySelectorAll('#template-picker option').length"), 10, 'nine 3v3 offense templates plus current selection');
  await runStartupFlow({send,evaluate,wait,waitFor,folder});
  await runReadOnlyFlow({send,evaluate,wait,waitFor,folder});
  await runLibraryDeckFlow({send,evaluate,wait,waitFor,folder});
  await runPageLayoutFlow({send,evaluate,wait,waitFor,folder});
  await runInlinePreviewFlow({send,evaluate,wait,waitFor,folder});
  await runOffenseExpansionFlow({send,evaluate,wait,waitFor,folder});
  await runArchivesFlow({send,evaluate,wait,waitFor,folder});
  await runCreationMotionFlow({send,evaluate,wait,waitFor,folder});
  await runLockerFrameFlow({send,evaluate,wait,waitFor,folder});
  await runTeamCarouselFlow({send,evaluate,wait,waitFor,folder});
  await runGlassSheetFlow({send,evaluate,wait,waitFor,folder});
  await runLineupFlow({send,evaluate,wait,waitFor,folder});
  await runPageMotionFlow({send,evaluate,wait,waitFor,folder});
  assert.deepEqual(errors, [], 'no browser runtime errors');
  assert.deepEqual(remoteRequests, [], 'app never depends on remote network resources');
  console.log('Browser QA passed: 26 tactics, NBA lineups, locker touch, recommendations, restart/export/offline, six layouts and circular navigation with rapid/cancel/reduced-motion checks.');
  console.log(`Screenshots: ${folder}`);
  // Chrome may close the debugging socket before replying to Browser.close.
  await Promise.race([send('Browser.close'), wait(1500)]);
} finally {
  connection?.close();
  if (browser.exitCode === null) {
    const exited = new Promise(resolve => browser.once('exit', resolve));
    browser.kill();
    await Promise.race([exited, wait(1500)]);
  }
  webServer.closeAllConnections();
  await new Promise(resolve => webServer.close(resolve));
  assert.equal(path.dirname(profile), path.resolve(folder), 'only delete this test browser profile inside QA');
  await rm(profile, {recursive:true,force:true,maxRetries:5,retryDelay:200});
}
