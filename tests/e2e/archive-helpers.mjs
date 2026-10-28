import assert from 'node:assert/strict';

export async function navigateLineupView({ evaluate, waitFor }, view) {
  await evaluate(`document.querySelector('[data-view-target="${view}"]').click()`);
  await waitFor(`document.body.dataset.view===${JSON.stringify(view)}&&!document.body.dataset.pageTransition`);
}

export async function findArchiveCard(context, id) {
  const { evaluate } = context;
  if (await evaluate("Boolean(document.querySelector('#lineup-archive-menu')?.open)")) {
    await evaluate("document.querySelector('[data-action=lineup-archive-close]').click()");
    await context.waitFor("!document.querySelector('#lineup-archive-menu').open");
  }
  await navigateLineupView(context, 'archives');
  while (await evaluate("Boolean(document.querySelector('[data-action=lineup-archives-prev]:not(:disabled)'))")) await evaluate("document.querySelector('[data-action=lineup-archives-prev]').click()");
  const selector = `.lineup-archive-card[data-profile-id=${JSON.stringify(id)}]`;
  for (let page = 0; page < 7; page++) {
    if (await evaluate(`Boolean(document.querySelector(${JSON.stringify(selector)}))`)) return selector;
    assert.ok(await evaluate("Boolean(document.querySelector('[data-action=lineup-archives-next]:not(:disabled)'))"), `archive ${id} remains reachable`);
    await evaluate("document.querySelector('[data-action=lineup-archives-next]').click()");
  }
  assert.fail(`archive ${id} not found within the twenty-profile limit`);
}

export async function selectArchive(context, id) {
  const { evaluate, waitFor } = context;
  await findArchiveCard(context, id);
  await evaluate(`document.querySelector('[data-action="lineup-select"][data-profile-id="${id}"]').click()`);
  await waitFor(`JSON.parse(localStorage.getItem('halfcourt-lineups-v1')).activeProfileId===${JSON.stringify(id)}&&document.body.dataset.view==='lineups'&&!document.body.dataset.pageTransition&&document.querySelector('#lineups-panel').getAttribute('aria-busy')==='false'`);
}

export async function beginArchiveCreate(context) {
  const { evaluate, waitFor } = context;
  await navigateLineupView(context, 'archives');
  await evaluate("(document.querySelector('[data-action=lineup-create-empty]')||document.querySelector('[data-action=lineup-create]')).click()");
  await waitFor("document.querySelector('#lineup-wizard-dialog')?.open&&document.querySelector('#lineup-wizard-dialog').dataset.phase==='open'");
}

export async function openArchiveMenu(context, id) {
  const { evaluate, waitFor } = context;
  await findArchiveCard(context, id);
  await evaluate(`document.querySelector('[data-action="lineup-archive-menu"][data-profile-id="${id}"]').click()`);
  await waitFor("document.querySelector('#lineup-archive-menu').open");
}
