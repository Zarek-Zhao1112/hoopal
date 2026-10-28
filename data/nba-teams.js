// Representative Icon-inspired kits, not a season-specific replica or official color specification.
// Official team directory: https://www.nba.com/teams
// Recent identity checks (2026-10-23):
// Jazz: https://www.nba.com/jazz/mountain-basketball/uniforms
// Clippers: https://www.nba.com/clippers/news/la-clippers-unveil-new-uniforms-logo-and-brand-look
// Cavaliers: https://www.nba.com/news/cavaliers-introduce-modernized-logo-collection
// Magic: https://www.nba.com/news/magic-unveil-new-logo-uniforms-2025-26
// Hex values below are local rendering approximations; trim/panels are simplified for the SVG kit.
const team = (id, nbaId, name, fullName, base, trim, secondary, text, wordmark) => Object.freeze({
  id, nbaId, name, fullName, jersey: Object.freeze({ base, trim, secondary, text, wordmark }),
});

export const NBA_TEAMS = Object.freeze([
  team('BOS', 1610612738, '凯尔特人', '波士顿凯尔特人', '#007A33', '#FFFFFF', '#005A27', '#FFFFFF', 'BOSTON'),
  team('LAL', 1610612747, '湖人', '洛杉矶湖人', '#FDB927', '#552583', '#FFFFFF', '#552583', 'LAKERS'),
  team('CHI', 1610612741, '公牛', '芝加哥公牛', '#CE1141', '#FFFFFF', '#000000', '#FFFFFF', 'CHICAGO'),
  team('MIA', 1610612748, '热火', '迈阿密热火', '#202020', '#98002E', '#F9A01B', '#FFFFFF', 'MIAMI'),
  team('NYK', 1610612752, '尼克斯', '纽约尼克斯', '#006BB6', '#F58426', '#FFFFFF', '#FFFFFF', 'NEW YORK'),
  team('BKN', 1610612751, '篮网', '布鲁克林篮网', '#202020', '#FFFFFF', '#707271', '#FFFFFF', 'BROOKLYN'),
  team('MIL', 1610612749, '雄鹿', '密尔沃基雄鹿', '#00471B', '#EEE1C6', '#0077C0', '#EEE1C6', 'MILWAUKEE'),
  team('DEN', 1610612743, '掘金', '丹佛掘金', '#0E2240', '#FEC524', '#8B2131', '#FFFFFF', 'DENVER'),
  team('PHX', 1610612756, '太阳', '菲尼克斯太阳', '#1D1160', '#E56020', '#FFFFFF', '#FFFFFF', 'PHOENIX'),
  team('DAL', 1610612742, '独行侠', '达拉斯独行侠', '#00538C', '#B8C4CA', '#002B5E', '#FFFFFF', 'DALLAS'),
  team('SAS', 1610612759, '马刺', '圣安东尼奥马刺', '#202020', '#C4CED4', '#FFFFFF', '#FFFFFF', 'SAN ANTONIO'),
  team('PHI', 1610612755, '76人', '费城76人', '#006BB6', '#FFFFFF', '#ED174C', '#FFFFFF', 'PHILA'),
  team('ATL', 1610612737, '老鹰', '亚特兰大老鹰', '#C8102E', '#FFCD00', '#FFFFFF', '#FFFFFF', 'ATLANTA'),
  team('CHA', 1610612766, '黄蜂', '夏洛特黄蜂', '#00788C', '#FFFFFF', '#1D1160', '#FFFFFF', 'CHARLOTTE'),
  team('CLE', 1610612739, '骑士', '克利夫兰骑士', '#860038', '#BC945C', '#211818', '#D7B978', 'CLEVELAND'),
  team('DET', 1610612765, '活塞', '底特律活塞', '#1D42BA', '#FFFFFF', '#C8102E', '#FFFFFF', 'DETROIT'),
  team('GSW', 1610612744, '勇士', '金州勇士', '#1D428A', '#FFC72C', '#FFFFFF', '#FFC72C', 'GOLDEN STATE'),
  team('HOU', 1610612745, '火箭', '休斯敦火箭', '#CE1141', '#FFFFFF', '#202020', '#FFFFFF', 'HOUSTON'),
  team('IND', 1610612754, '步行者', '印第安纳步行者', '#002D62', '#FDBB30', '#FFFFFF', '#FDBB30', 'INDIANA'),
  team('LAC', 1610612746, '快船', '洛杉矶快船', '#1D2D44', '#FFFFFF', '#C8102E', '#FFFFFF', 'CLIPPERS'),
  team('MEM', 1610612763, '灰熊', '孟菲斯灰熊', '#12173F', '#5D76A9', '#F5B112', '#B7C9E2', 'MEMPHIS'),
  team('MIN', 1610612750, '森林狼', '明尼苏达森林狼', '#0C2340', '#9EA2A2', '#236192', '#FFFFFF', 'MINNESOTA'),
  team('NOP', 1610612740, '鹈鹕', '新奥尔良鹈鹕', '#0C2340', '#B4975A', '#C8102E', '#FFFFFF', 'NEW ORLEANS'),
  team('OKC', 1610612760, '雷霆', '俄克拉荷马城雷霆', '#007AC1', '#EF3B24', '#002D62', '#FFFFFF', 'OKLAHOMA CITY'),
  team('ORL', 1610612753, '魔术', '奥兰多魔术', '#0077C0', '#C4CED4', '#202020', '#FFFFFF', 'ORLANDO'),
  team('POR', 1610612757, '开拓者', '波特兰开拓者', '#202020', '#FFFFFF', '#E03A3E', '#FFFFFF', 'PORTLAND'),
  team('SAC', 1610612758, '国王', '萨克拉门托国王', '#5A2D81', '#C4CED4', '#202020', '#FFFFFF', 'SACRAMENTO'),
  team('TOR', 1610612761, '猛龙', '多伦多猛龙', '#CE1141', '#FFFFFF', '#202020', '#FFFFFF', 'RAPTORS'),
  team('UTA', 1610612762, '爵士', '犹他爵士', '#6C3B99', '#A4C7E5', '#202020', '#FFFFFF', 'UTAH'),
  team('WAS', 1610612764, '奇才', '华盛顿奇才', '#E31837', '#FFFFFF', '#002B5C', '#FFFFFF', 'WASHINGTON'),
]);

const teamsById = new Map(NBA_TEAMS.map(value => [value.id, value]));
/** Lookup is strict. Null/unknown values stay unselected rather than choosing a fallback team. */
export function getNbaTeam(id) { return typeof id === 'string' ? teamsById.get(id) ?? null : null; }
