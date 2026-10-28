// Explicit maintenance command, never run by app/build; all runtime logos are local.
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const entries = { ATL:1610612737,BOS:1610612738,CLE:1610612739,NOP:1610612740,CHI:1610612741,DAL:1610612742,DEN:1610612743,GSW:1610612744,HOU:1610612745,LAC:1610612746,LAL:1610612747,MIA:1610612748,MIL:1610612749,MIN:1610612750,BKN:1610612751,NYK:1610612752,ORL:1610612753,IND:1610612754,PHI:1610612755,PHX:1610612756,POR:1610612757,SAC:1610612758,SAS:1610612759,OKC:1610612760,TOR:1610612761,UTA:1610612762,MEM:1610612763,WAS:1610612764,DET:1610612765,CHA:1610612766 };
const directory = new URL('../frontend/assets/nba/', import.meta.url);
await mkdir(directory, { recursive:true });
await mkdir(new URL('../data/nba/', import.meta.url), { recursive:true });
const manifest = [];
for (const [id,nbaId] of Object.entries(entries)) {
  const url = `https://cdn.nba.com/logos/nba/${nbaId}/primary/L/logo.svg`;
  const response = await fetch(url, { signal:AbortSignal.timeout(30000) });
  if (!response.ok) throw Error(`${id}: HTTP ${response.status}`);
  const svg = await response.text();
  if (!/<svg[\s>]/i.test(svg) || !response.headers.get('content-type')?.includes('svg')) throw Error(`${id}: not SVG`);
  if (/<(?:script|foreignObject|iframe|image)\b|\son[a-z]+\s*=|<!ENTITY|(?:href|src)\s*=\s*["'](?!#)|url\(\s*["']?(?!#)[^)]/i.test(svg)) throw Error(`${id}: unexpected active or external SVG content`);
  await writeFile(new URL(`${id}.svg`,directory), svg);
  manifest.push({id,nbaId,url,bytes:Buffer.byteLength(svg),sha256:createHash('sha256').update(svg).digest('hex')});
  console.log(`${id}: ${Buffer.byteLength(svg)} bytes`);
}
await writeFile(new URL('../data/nba/logo-sources.json',import.meta.url), JSON.stringify({source:'https://www.nba.com/teams',retrievedAt:new Date().toISOString(),logos:manifest},null,2)+'\n');
console.log(`Saved ${manifest.length} official logos to ${fileURLToPath(directory)}`);
