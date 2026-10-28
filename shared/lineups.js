import { getNbaTeam } from '../data/nba-teams.js';

export const MAX_LINEUPS = 20;
export const SKILLS = Object.freeze([
  { id: 'shooting', label: '投射' }, { id: 'driving', label: '突破' },
  { id: 'passing', label: '传球' }, { id: 'handling', label: '控球' },
  { id: 'screening', label: '掩护' }, { id: 'finishing', label: '篮下终结' }
].map(Object.freeze));
export const TRAITS = Object.freeze({
  height: Object.freeze([{ id: 'short', label: '偏矮' }, { id: 'medium', label: '中等' }, { id: 'tall', label: '偏高' }].map(Object.freeze)),
  build: Object.freeze([{ id: 'slim', label: '偏瘦' }, { id: 'medium', label: '中等' }, { id: 'strong', label: '强壮' }].map(Object.freeze)),
  mobility: Object.freeze([{ id: 'slow', label: '偏慢' }, { id: 'average', label: '一般' }, { id: 'agile', label: '灵活' }].map(Object.freeze))
});
const skillIds = new Set(SKILLS.map(skill => skill.id));
let sequence = 0;
const newId = prefix => `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${(++sequence).toString(36)}-${Math.random().toString(36).slice(2, 10)}`}`;
function text(value, label, limit, empty = false) {
  if (typeof value !== 'string' || value.length > limit || (!empty && !value.trim())) throw new Error(`${label}无效（最多${limit}字）`);
  return value.trim();
}
function oneOf(value, allowed, label) {
  if (!allowed.includes(value)) throw new Error(`${label}无效`);
  return value;
}
function skills(value, max, label) {
  if (!Array.isArray(value) || value.length > max || value.some(id => !skillIds.has(id)) || new Set(value).size !== value.length) throw new Error(`${label}无效（最多${max}项且不能重复）`);
  return [...value];
}

/** Validate and return only the supported fields; incomplete traits are valid saved drafts. */
export function validateLineup(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('阵容格式无效');
  const mode = oneOf(value.mode, ['3v3', '4v4'], '人数');
  const count = mode === '3v3' ? 3 : 4;
  if (!Number.isSafeInteger(value.revision) || value.revision < 1) throw new Error('阵容版本无效');
  if (!Array.isArray(value.players) || value.players.length !== count) throw new Error(`该阵容需要${count}名队员`);
  const nbaTeamId = value.nbaTeamId == null ? null : value.nbaTeamId;
  if (nbaTeamId !== null && !getNbaTeam(nbaTeamId)) throw new Error('NBA球队无效，请重新选择');
  const ids = new Set(), numbers = new Set();
  const players = value.players.map(player => {
    if (!player || typeof player !== 'object' || Array.isArray(player)) throw new Error('队员格式无效');
    const id = text(player.id, '队员ID', 100);
    if (ids.has(id)) throw new Error('队员ID不能重复');
    ids.add(id);
    if (!Number.isInteger(player.number) || player.number < 0 || player.number > 99 || numbers.has(player.number)) throw new Error('球衣号码须为0–99且不能重复');
    numbers.add(player.number);
    const strengths = skills(player.strengths, 3, '擅长项'), weaknesses = skills(player.weaknesses, 2, '弱项');
    if (strengths.some(skill => weaknesses.includes(skill))) throw new Error('同一能力不能同时为擅长和弱项');
    return { id, name: text(player.name, '昵称', 24, true), number: player.number,
      height: oneOf(player.height, ['', ...TRAITS.height.map(item => item.id)], '身高'),
      build: oneOf(player.build, ['', ...TRAITS.build.map(item => item.id)], '体格'),
      mobility: oneOf(player.mobility, ['', ...TRAITS.mobility.map(item => item.id)], '移动能力'), strengths, weaknesses };
  });
  return { id: text(value.id, '阵容ID', 100), name: text(value.name, '阵容名称', 40), mode,
    crest: oneOf(value.crest, ['ball', 'shield', 'bolt'], '队徽'), color: oneOf(value.color, ['orange', 'blue', 'green'], '主题色'),
    revision: value.revision, players, nbaTeamId,
    recentTemplateId: value.recentTemplateId === null ? null : text(value.recentTemplateId, '最近战术ID', 100) };
}

export function createLineup(mode = '3v3', options = {}) {
  oneOf(mode, ['3v3', '4v4'], '人数');
  return validateLineup({ id: options.id ?? newId('lineup'), name: options.name ?? (mode === '3v3' ? '三人阵容' : '四人阵容'), mode,
    crest: options.crest ?? 'ball', color: options.color ?? 'orange', nbaTeamId: options.nbaTeamId ?? null, revision: 1, recentTemplateId: null,
    players: Array.from({ length: mode === '3v3' ? 3 : 4 }, (_, index) => ({
      id: newId('member'), name: '', number: index + 1, height: '', build: '', mobility: '', strengths: [], weaknesses: []
    })) });
}

export function isLineupReady(value) {
  try { return validateLineup(value).players.every(player => player.height && player.build && player.mobility); }
  catch { return false; }
}

export function playerLabel(player, index = 0) { return player.name || `队员 ${String.fromCharCode(65 + index)}`; }
