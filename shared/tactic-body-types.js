// Browsing categories describe the team's overall relative body sizes only.
// They do not establish court positions, individual skills or match outcomes.
const freezeTypes = types => Object.freeze(types.map(type => Object.freeze(type)));
export const BODY_TYPES = Object.freeze({
  '3v3': freezeTypes([
    { id: 'one-big', label: '一大两小', description: '一名体型较大，两名体型较小', largeCount: 1, smallCount: 2, equalCount: 0 },
    { id: 'two-big', label: '两大一小', description: '两名体型较大，一名体型较小', largeCount: 2, smallCount: 1, equalCount: 0 },
    { id: 'similar', label: '体型接近', description: '三人体型比较接近', largeCount: 0, smallCount: 0, equalCount: 3 },
  ]),
  '4v4': freezeTypes([
    { id: 'one-big', label: '一大三小', description: '一名体型较大，三名体型较小', largeCount: 1, smallCount: 3, equalCount: 0 },
    { id: 'two-big', label: '两大两小', description: '两名体型较大，两名体型较小', largeCount: 2, smallCount: 2, equalCount: 0 },
    { id: 'three-big', label: '三大一小', description: '三名体型较大，一名体型较小', largeCount: 3, smallCount: 1, equalCount: 0 },
    { id: 'similar', label: '体型接近', description: '四人体型比较接近', largeCount: 0, smallCount: 0, equalCount: 4 },
  ]),
});

const fail = message => { throw new Error(message); };
const validMode = mode => typeof mode === 'string' && Object.hasOwn(BODY_TYPES, mode);
const validText = value => typeof value === 'string' && value.trim().length > 0;

export function getBodyTypes(mode) {
  if (!validMode(mode)) fail('请选择3v3或4v4人数');
  return BODY_TYPES[mode].map(type => ({ ...type }));
}

export function isBodyTypeForMode(mode, id) {
  return validMode(mode) && typeof id === 'string' && BODY_TYPES[mode].some(type => type.id === id);
}

export function validateTacticBodyTypes(template) {
  if (!template || !validText(template.id) || !validMode(template.mode) || !['offense', 'defense'].includes(template.kind)) fail('战术体型分类：战术身份或人数无效');
  const { bodyTypes, bodyTypeNotes } = template;
  if (!Array.isArray(bodyTypes) || !bodyTypes.length || new Set(bodyTypes).size !== bodyTypes.length || bodyTypes.some(id => !isBodyTypeForMode(template.mode, id))) fail(`${template.id}：缺少完整或合法的体型分类`);
  if (!bodyTypeNotes || typeof bodyTypeNotes !== 'object' || Array.isArray(bodyTypeNotes) || Object.keys(bodyTypeNotes).length !== bodyTypes.length || Object.keys(bodyTypeNotes).some(id => !bodyTypes.includes(id))) fail(`${template.id}：体型分类说明无效`);
  const notes = {};
  for (const id of bodyTypes) {
    if (!Object.hasOwn(bodyTypeNotes, id) || !validText(bodyTypeNotes[id]) || bodyTypeNotes[id].length > 120) fail(`${template.id}：每个体型分类需要简短配合说明`);
    notes[id] = bodyTypeNotes[id].trim();
  }
  return { bodyTypes: [...bodyTypes], bodyTypeNotes: notes };
}

export function filterTacticsByBodyType(templates, { mode, kind = 'offense', bodyType = null } = {}) {
  if (!Array.isArray(templates)) fail('战术目录无效');
  if (!validMode(mode) || !['offense', 'defense'].includes(kind)) fail('战术筛选人数或攻防无效');
  if (bodyType !== null && !isBodyTypeForMode(mode, bodyType)) fail('请选择与人数相同的体型分类');
  // Validate all registered entries so a malformed definition is never silently
  // hidden behind a filter or treated as a fallback for the current team.
  return templates.filter(template => {
    const metadata = validateTacticBodyTypes(template);
    return template.mode === mode && template.kind === kind && (bodyType === null || metadata.bodyTypes.includes(bodyType));
  });
}

export function getTacticBodyNote(template, bodyType) {
  const metadata = validateTacticBodyTypes(template);
  if (!isBodyTypeForMode(template.mode, bodyType) || !metadata.bodyTypes.includes(bodyType)) fail('该战术未归入此体型分类');
  return metadata.bodyTypeNotes[bodyType];
}
