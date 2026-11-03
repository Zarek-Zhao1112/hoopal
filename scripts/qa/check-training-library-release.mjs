import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createBrowserSession } from './browser-session.mjs';
import { runTrainingLibraryFlow, runBuiltinSelectionFailureFlow } from '../../tests/e2e/training-library-flow.mjs';

assert.ok(process.argv.slice(2).every(arg => arg === '--builtin-only'), 'Supported option: --builtin-only');
const folder = path.resolve('artifacts/qa/runs/hc059-library-' + Date.now());
await mkdir(folder, { recursive: true });
let session; const report = { started: new Date().toISOString(), passed: false, scope: process.argv.includes('--builtin-only') ? 'builtin-save-failure' : 'training-library' };
try {
  session = await createBrowserSession({ name: 'hc059-library', viewport: { width: 390, height: 844 } });
  await session.send('Page.navigate', { url: session.origin });
  await session.waitFor("document.body.dataset.appReady==='true'&&!document.querySelector('#startup-screen')");
  if (report.scope === 'builtin-save-failure') await runBuiltinSelectionFailureFlow({ ...session, folder });
  else await runTrainingLibraryFlow({ ...session, folder });
  assert.deepEqual(session.errors, []); assert.deepEqual(session.remoteRequests, []); report.passed = true;
} catch (error) { report.error = error.stack || String(error); process.exitCode = 1; }
finally {
  report.browserErrors = session?.errors; report.remoteRequests = session?.remoteRequests;
  try { await session?.close(); report.tempCleaned = true; } catch (error) { report.cleanupError = String(error); report.passed = false; process.exitCode = 1; }
  report.finished = new Date().toISOString(); await writeFile(path.join(folder, 'run.json'), JSON.stringify(report, null, 2));
}
console.log(JSON.stringify({ folder, ...report }));
