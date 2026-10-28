import {SKILLS} from '../../../../shared/lineups.js';
export const playerName=(player,index=0)=>player?.name?.trim()||`队员 ${String.fromCharCode(65+index)}`;
export const skillLabel=id=>SKILLS.find(skill=>skill.id===id)?.label||id;
export function splitLineupText(value, limit = 80, maxBreaks = 3) {
  const text = String(value ?? ''), pages = [];
  let part = '', breaks = 0;
  for (const character of text) {
    if (Array.from(part).length >= limit || (character === '\n' && breaks >= maxBreaks)) {
      pages.push(part); part = ''; breaks = 0;
    }
    part += character;
    if (character === '\n') breaks++;
  }
  if (part || !pages.length) pages.push(part);
  return pages;
}
