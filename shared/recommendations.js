import { SKILLS, validateLineup, isLineupReady, playerLabel } from './lineups.js';
import { templates } from './templates.js';
import { offenseRules } from '../data/recommendations/offense.js';

const labels = Object.fromEntries(SKILLS.map(skill => [skill.id, skill.label]));
const ability = (player, skill) => player.strengths.includes(skill) ? 1 : player.weaknesses.includes(skill) ? -1 : 0;
const compareId = (a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
const unique = values => [...new Set(values)];

function permutations(players) {
  if (!players.length) return [[]];
  return players.flatMap((player, index) => permutations(players.filter((_, i) => i !== index)).map(tail => [player, ...tail]));
}

function evaluate(rule, members) {
  let weighted = 0, total = 0, conditions = 0, movingSlow = 0, agile = 0, bodySupport = 0;
  rule.roles.forEach((role, i) => {
    const player = members[i];
    for (const [skill, importance] of Object.entries(role.weights)) {
      const level = ability(player, skill);
      total += importance;
      weighted += importance * (level < 0 ? -1.8 : level);
      // Even a secondary action remains an explicit execution condition when marked weak.
      if (level < 0 && !role.essential.includes(skill)) conditions++;
    }
    conditions += role.essential.filter(skill => ability(player, skill) !== 1).length;
    if (role.moving && player.mobility === 'slow') movingSlow++;
    if (role.moving && player.mobility === 'agile') agile++;
    // Body tags support an ALREADY declared skill, never create that skill.
    if (role.weights.screening && ability(player, 'screening') === 1 && player.build === 'strong') bodySupport += .3;
    if (role.weights.finishing && ability(player, 'finishing') === 1 && player.height === 'tall') bodySupport += .3;
  });
  return { score: weighted / total * 100 - conditions * 3 - rule.complexity * 2 - movingSlow * 9 + agile * .6 + bodySupport,
    conditional: conditions > 0 || movingSlow > 0 };
}

function summaryFor(profile, display) {
  const players = profile.players;
  const result = SKILLS.map(({ id, label }) => {
    const strong = players.filter(player => ability(player, id) === 1), weak = players.filter(player => ability(player, id) === -1);
    return `${label}：${strong.length ? `${strong.map(display).join('、')}标为擅长` : `没有标注${label}优势，其余按一般处理`}${weak.length ? `；${weak.map(display).join('、')}明确标为弱项` : ''}。`;
  });
  const slow = players.filter(player => player.mobility === 'slow'), agile = players.filter(player => player.mobility === 'agile');
  result.push(`移动：${agile.length ? `${agile.map(display).join('、')}标为灵活` : '没有标注灵活优势'}${slow.length ? `；${slow.map(display).join('、')}偏慢，需控制连续切入和突破负担` : ''}。`);
  if (!players.some(player => player.strengths.length)) result.push('能力均按一般或已标弱项处理，先用基础配合确认执行条件，不把备选当作强匹配。');
  const signatures = players.map(player => `${[...player.strengths].sort().join(',')}|${[...player.weaknesses].sort().join(',')}|${player.mobility}`);
  if (new Set(signatures).size === 1) result.push('队员能力标签同型，分工按稳定成员标识处理；没有凭标签形成明显互补。');
  if (players.filter(player => player.strengths.includes('handling') || player.strengths.includes('passing')).length === 1) result.push('持球与传球优势集中在一名队员，不能由同一人兼任两个职责；第二组织点仍需确认。');
  result.push('身高与体格只作辅助参考，不代表已具备掩护、终结或投射能力；这些是训练配合建议，不保证得分。');
  return result;
}

/** Deterministic local role matching. No generated plays, opponent prediction or win rates. */
export function recommendLineup(value) {
  const profile = validateLineup(value);
  if (!isLineupReady(profile)) return { ready: false, summary: [], message: '请先为每名队员选择身高、体格和移动能力；能力未选项按一般处理。', recommendations: [] };
  const display = player => `${playerLabel(player, profile.players.findIndex(item => item.id === player.id))}（${player.number}号）`;
  const arrangements = permutations([...profile.players].sort(compareId));
  const candidates = offenseRules.flatMap((rule, order) => {
    const template = templates.find(item => item.id === rule.templateId && item.mode === profile.mode && item.kind === 'offense');
    if (!template || rule.roles.length !== profile.players.length) return [];
    let best;
    for (const members of arrangements) {
      const evaluated = evaluate(rule, members);
      // Sorted IDs + strict greater-than retains a stable bijection for equal scores.
      if (!best || evaluated.score > best.score + 1e-9) best = { ...evaluated, members };
    }
    return [{ rule, template, order, ...best }];
  });
  candidates.sort((a, b) => b.score - a.score || a.order - b.order);
  const recommendations = candidates.slice(0, 3).map(({ rule, template, members, conditional }) => {
    const reasons = [], cautions = [];
    const assignments = rule.roles.map((role, index) => {
      const player = members[index], name = display(player), number = index + 1;
      const strengths = Object.keys(role.weights).filter(skill => ability(player, skill) === 1);
      if (strengths.length) reasons.push(`${name}标注${strengths.map(skill => labels[skill]).join('、')}擅长，对应${number}号：${role.task}。`);
      const absent = role.essential.filter(skill => ability(player, skill) === 0);
      if (absent.length) cautions.push(`${number}号${name}的${absent.map(skill => labels[skill]).join('、')}按一般处理，未标优势；需先确认能完成本职责。`);
      const weak = Object.keys(role.weights).filter(skill => ability(player, skill) === -1);
      if (weak.length) cautions.push(`${number}号${name}明确将${weak.map(skill => labels[skill]).join('、')}标为弱项，与本职责有冲突，需降低难度或先练习。`);
      if (role.weights.shooting && ability(player, 'shooting') === 0) cautions.push(`${number}号${name}未标投射优势，拉开或接投的实际威胁需要练习确认；不等同于不会投。`);
      if (role.moving && player.mobility === 'slow') cautions.push(`${number}号${name}移动偏慢，${role.task}有移动负担；先放慢节奏练习，不能依赖速度甩开防守。`);
      if (role.moving && player.mobility === 'agile') reasons.push(`${number}号${name}标为灵活，可支持本职责的跑位衔接；仍需按时机行动。`);
      return { role: number, playerId: player.id, task: role.task };
    });
    if (!reasons.length) reasons.push('按一般能力安排基础职责，没有标注专长可支持优势判断；先确认下列执行条件。');
    if (rule.complexity >= 3) cautions.push('本配合需要掩护站稳、传球与释放时机连续衔接，先分段练习；不因标签齐全就保证出现空位。');
    if (!cautions.length) cautions.push('标签只描述己方特点，实际传球窗口与出手机会仍取决于防守和配合时机。');
    return { templateId: template.id, title: template.title, fit: conditional ? 'conditional' : 'recommended', reasons: unique(reasons), cautions: unique(cautions), assignments };
  });
  return { ready: true, summary: summaryFor(profile, display),
    message: recommendations.every(item => item.fit === 'conditional') ? '当前均为有条件备选：先确认职责缺口，再按步骤慢速练习。' : '按已选标签匹配己方职责，结合执行条件选择配合；不是专业评估或得分预测。', recommendations };
}
