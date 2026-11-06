import { assignTeamRoles } from '../../../shared/team-roles.js';
import './preview.css';

// The preview uses only the current phone's jersey numbers and role choices,
// copied into an in-memory fixture. It never reads names or writes local data.
const members = [
  { id: 'p11', number: 11, mainRole: 'support', secondaryRole: 'spacing' },
  { id: 'p2', number: 2, mainRole: 'space' },
  { id: 'p10', number: 10, mainRole: 'start' },
];
const viewProfile = { id: 'local-preview', mode: '3v3', players: members };
const roles = { start: '持球发起', support: '掩护策应', spacing: '空间拉开', space: '得分终结' };
const definitions = import.meta.glob('../../../data/tactics/offense/3v3/*.js', { eager: true, import: 'default' });
const tactics = Object.values(definitions).sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'));
const root = document.createElement('main');
root.className = 'role-map';
root.innerHTML = `
  <header><p>HOOPAL · 更衣室角色映射</p><h1>你的球队 · 九套进攻站位</h1>
    <div class="members"></div><p class="intro">每张球场显示所选战术的真实起始站位。点开卡片看每位球员在这套配合里的具体动作。</p>
  </header><section class="tactics" aria-label="三人进攻战术"></section>`;
document.body.replaceChildren(root);
const membersBar = root.querySelector('.members');
for (const member of members) {
  const chip = document.createElement('span');
  chip.innerHTML = `<b>#${member.number}</b> ${roles[member.mainRole] || '未设置'}`;
  membersBar.append(chip);
}
const grid = root.querySelector('.tactics');
for (const template of tactics) {
  if (template.mode !== '3v3' || !template.roles?.length) continue;
  const assigned = assignTeamRoles({ ...template, kind: 'offense' }, viewProfile) || [];
  const lookup = new Map(assigned.map(row => [row.playerId, row]));
  const step = template.steps[0], markers = ['attack-1', 'attack-2', 'attack-3'];
  const positions = step.positions || {};
  const card = document.createElement('article');
  card.className = 'tactic';
  const heading = document.createElement('button');
  heading.className = 'tactic-heading';
  heading.type = 'button';
  heading.innerHTML = `<span class="title">${template.title}</span><span class="score">动作说明　＋</span>`;
  const court = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  court.setAttribute('viewBox', '0 0 1000 700');
  court.setAttribute('class', 'court');
  court.setAttribute('role', 'img');
  court.setAttribute('aria-label', template.title + '起始站位');
  court.innerHTML = `<rect width="1000" height="700" rx="12" class="wood"/>
    <path d="M25 25H975V675H25Z M355 25V205H645V25 M355 205A145 145 0 0 0 645 205 M425 25V118A75 75 0 0 0 575 118V25 M465 155A35 35 0 0 0 535 155 M25 350H975 M25 300A50 50 0 0 1 75 350 M975 300A50 50 0 0 0 925 350" class="lines"/>
    <circle cx="500" cy="122" r="9" class="hoop"/>`;
  for (const [index, marker] of markers.entries()) {
    const [x, y] = positions[marker] || [[500, 530], [220, 375], [780, 375]][index];
    const row = lookup.get(marker);
    const number = row?.number ?? '?';
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('transform', `translate(${x} ${y})`);
    group.innerHTML = `<circle r="36" class="player"/><text y="9" class="number">#${number}</text><text y="59" class="position">球员${index + 1}</text>`;
    court.append(group);
  }
  const duties = document.createElement('div');
  duties.className = 'duties';
  duties.innerHTML = markers.map((marker, index) => {
    const row = lookup.get(marker);
    const role = template.roles.find(item => item.playerId === marker);
    const player = members.find(item => item.id === row?.memberId);
    return `<article><b>#${row?.number ?? '?'} · ${roles[player?.mainRole] || '未设置'}</b><span>球员${index + 1}位 · ${role?.title || '战术位置'}</span><p>${role?.task || '无动作说明'}</p></article>`;
  }).join('');
  const body = document.createElement('div');
  body.className = 'tactic-body';
  body.append(court, duties);
  card.append(heading, body);
  heading.addEventListener('click', () => {
    const selected = card.classList.toggle('selected');
    heading.querySelector('.score').textContent = selected ? '动作说明　－' : '动作说明　＋';
  });
  grid.append(card);
}
