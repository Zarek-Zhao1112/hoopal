import assert from 'node:assert/strict';

export const libraryDialog = '#tactic-library-dialog';
export const libraryAction = name => `${libraryDialog} [data-action="selection-${name}"]`;

/** Pointer helpers assert the actual control centre is reachable. */
export function libraryControls({ send, evaluate, waitFor, wait }) {
  const point = selector => evaluate(`(()=>{const n=document.querySelector(${JSON.stringify(selector)});if(!n||n.disabled)throw Error('Missing/disabled '+${JSON.stringify(selector)});n.scrollIntoView({block:'nearest',inline:'nearest'});const r=n.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2,h=document.elementFromPoint(x,y);if(!r.width||!r.height||x<0||y<0||x>=innerWidth||y>=innerHeight||!(h===n||n.contains(h)))throw Error('Cannot hit '+${JSON.stringify(selector)}+'; hit='+h?.outerHTML.slice(0,180));return{x,y}})()`);
  const click = async selector => { const p = await point(selector); for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, ...p, button: 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: 1 }); return p; };
  const key = async (key, modifiers = 0) => { for (const type of ['keyDown', 'keyUp']) await send('Input.dispatchKeyEvent', { type, key, code: key, windowsVirtualKeyCode: key === 'Tab' ? 9 : key === 'Escape' ? 27 : 0, modifiers }); };
  const phase = value => waitFor(`document.querySelector('${libraryDialog}')?.dataset.phase===${JSON.stringify(value)}`);
  const nav = async view => { await click(`[data-view-target="${view}"]`); await waitFor(`document.body.dataset.view===${JSON.stringify(view)}&&!document.body.dataset.pageTransition`); };
  const open = async () => { await nav('play'); await click('#open-tactic-library'); await phase('open'); };
  const close = async () => { await click(libraryAction('close')); await phase('closed'); };
  const mode = async value => { await evaluate(`(()=>{const n=document.querySelector('${libraryAction('mode')}');if(!n||n.disabled)throw Error('Mode is locked');n.value=${JSON.stringify(value)};n.dispatchEvent(new Event('change',{bubbles:true}))})()`); await waitFor(`document.querySelector('${libraryDialog}').dataset.mode===${JSON.stringify(value)}`); };
  const kind = value => click(`${libraryAction('kind')}[data-kind="${value}"]`);
  const expand = async id => { await click(`${libraryAction('card')}[data-template-id="${id}"]`); await waitFor(`document.querySelector('${libraryAction('preview')}')?.dataset.previewId===${JSON.stringify(id)}`); };
  const choose = async id => { await expand(id); await click(libraryAction('play')); await phase('closed'); await waitFor(`!document.body.classList.contains('is-loading')&&document.querySelector('#template-picker').value===${JSON.stringify(id)}`); };
  const ready = () => waitFor("document.body.dataset.appReady==='true'&&!document.querySelector('#startup-screen')&&!document.body.dataset.pageTransition&&!document.body.classList.contains('is-loading')");
  const teams = async () => { await nav('archives'); if (await evaluate("Boolean(document.querySelector('[data-action=teams-open]'))")) await click('[data-action=teams-open]'); await waitFor("document.querySelector('#lineups-panel').dataset.subview==='teams'"); };
  return { point, click, key, phase, nav, open, close, mode, kind, expand, choose, ready, teams };
}

export async function restoreFixture({ send, evaluate, waitFor }, archive, selection) {
  const source = `${archive === null ? "localStorage.removeItem('halfcourt-lineups-v1')" : `localStorage.setItem('halfcourt-lineups-v1',${JSON.stringify(typeof archive === 'string' ? archive : JSON.stringify(archive))})`};${selection === null ? "localStorage.removeItem('halfcourt-builtin-selection-v1')" : `localStorage.setItem('halfcourt-builtin-selection-v1',${JSON.stringify(typeof selection === 'string' ? selection : JSON.stringify(selection))})`};window.__hc059Fixture=true;`;
  const script = await send('Page.addScriptToEvaluateOnNewDocument', { source });
  try { await evaluate('window.__hc059Fixture=false'); await send('Page.reload'); await waitFor("window.__hc059Fixture&&document.body?.dataset.appReady==='true'&&!document.querySelector('#startup-screen')"); }
  finally { await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: script.identifier }); }
}

export function assertNoPageOverflow(geometry) { assert.ok(geometry.scrollWidth <= geometry.width + 1 && geometry.scrollHeight <= geometry.height + 1, JSON.stringify(geometry)); }
