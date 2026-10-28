import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { NBA_TEAMS } from '../../data/nba-teams.js';

test('all 30 official NBA logos are bundled, have verified provenance and no active/external content', async () => {
  const directory = new URL('../../frontend/assets/nba/',import.meta.url);
  const manifest = JSON.parse(await readFile(new URL('../../data/nba/logo-sources.json',import.meta.url),'utf8'));
  assert.equal(manifest.logos.length,30);
  assert.deepEqual((await readdir(directory)).sort(),NBA_TEAMS.map(team=>`${team.id}.svg`).sort());
  for (const team of NBA_TEAMS) {
    const entry = manifest.logos.find(logo=>logo.id===team.id);
    assert.equal(Number(entry.nbaId),Number(team.nbaId));
    assert.equal(entry.url,`https://cdn.nba.com/logos/nba/${team.nbaId}/primary/L/logo.svg`);
    const source = await readFile(new URL(`${team.id}.svg`,directory),'utf8');
    assert.match(source,/<svg[\s>]/i);
    assert.equal(Buffer.byteLength(source),entry.bytes);
    assert.equal(createHash('sha256').update(source).digest('hex'),entry.sha256);
    assert.doesNotMatch(source,/<(?:script|foreignObject|iframe|image)\b|\son[a-z]+\s*=|<!ENTITY|(?:href|src)\s*=\s*["'](?!#)/i);
  }
});
