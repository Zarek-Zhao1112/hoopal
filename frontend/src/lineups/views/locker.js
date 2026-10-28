import { createEmptyLocker } from '../components/locker-room.js';
import { isLineupReady } from '../../../../shared/lineups.js';
import { getNbaTeam } from '../../../../data/nba-teams.js';
import { playerName } from './text.js';
import { TRAITS } from '../../../../shared/lineups.js';
import { skillLabel } from './text.js';
import { createLockerRoom } from '../components/locker-room.js';

/** A feature-owned view, using the coordinator's explicit state and callbacks. */
export function createLockerView(context){
 const {header,button,navigate,root,active,node,model,document,inspect,crest,selectedByProfile,jersey,draw,dirty,beginEdit}=context;
 let lockerRoom=null;
 function profilePageView() {
    header('更衣室', '', false, button('换球队 ›', 'lineup-switch-archive', () => navigate('archives'), { className: 'button button-subtle' }));
    const cardHeading = root.lastElementChild; cardHeading.remove();
    const profile = active();
    if (!profile) {
      const empty = node('article', 'lineup-empty lineup-main-empty');
      empty.append(cardHeading, node('h2', '', model.state.profiles.length ? '选一支球队，进入更衣室' : '先组一支自己的球队'), createEmptyLocker({ document }), node('p', '', '球队的创建与管理，都在档案中。'));
      empty.append(button(model.state.profiles.length ? '去档案选择球队' : '去档案创建球队', 'lineup-open-archives', () => navigate('archives'), { className: 'button button-primary' }));
      root.append(empty); return;
    }
    const card = node('article', 'lineup-profile-card'); card.dataset.color = profile.color; card.dataset.mode = profile.mode;
    const top = node('div', 'lineup-profile-top');
    const title = node('div', 'lineup-profile-title');
    const name = node('h2');
    name.append(button(profile.name, 'lineup-inspect-profile', () => inspect('阵容名称', profile.name), { className: 'lineup-text-link' }));
    title.append(name, node('p', '', `${profile.mode} · ${isLineupReady(profile) ? '已配置' : '待完善'} · 当前球队`));
    const identity = node('span', 'lineup-profile-team', getNbaTeam(profile.nbaTeamId)?.name || '未选择 NBA 球队');
    title.append(identity);
    top.append(crest(profile), title);
    let focusedIndex = profile.players.findIndex(player => player.id === selectedByProfile.get(profile.id));
    if (focusedIndex < 0) focusedIndex = 0;
    selectedByProfile.set(profile.id, profile.players[focusedIndex].id);
    const detail = node('section', 'locker-player-detail');
    function updateDetail(index) {
      const player = profile.players[index];
      detail.dataset.playerId = player.id; detail.dataset.playerIndex = String(index);
      const top = node('div', 'locker-detail-top');
      top.append(button(playerName(player, index), 'lineup-inspect-player', () => inspect('队员资料', `${playerName(player, index)}\n球衣 ${player.number} 号`), { className: 'locker-player-name' }), node('span', 'locker-player-number', `球衣 ${player.number} 号`));
      const traits = node('div', 'locker-detail-row locker-traits'); traits.append(node('span', 'locker-detail-label', '特点'));
      for (const [key, label] of [['height', '身高'], ['build', '体格'], ['mobility', '移动']]) {
        const value = TRAITS[key].find(item => item.id === player[key])?.label || '待选';
        const text = `${label}${value}`;
        traits.append(button(text, 'lineup-inspect-trait', () => inspect('体型与移动特点', `${playerName(player, index)}\n${label}：${value}`), { className: 'locker-chip', data: { trait: key, value: player[key] } }));
      }
      const fullText = `${playerName(player, index)}\n擅长：${player.strengths.length ? player.strengths.map(skillLabel).join('、') : '未标注，按一般处理'}\n弱项：${player.weaknesses.length ? player.weaknesses.map(skillLabel).join('、') : '未标注'}\n未标注的能力按一般处理。`;
      const skillsRow = (key, label) => {
        const row = node('div', `locker-detail-row locker-${key}`); row.append(node('span', 'locker-detail-label', label));
        if (!player[key].length) row.append(button(key === 'strengths' ? '未标擅长，按一般处理' : '未标弱项', 'lineup-inspect-skills', () => inspect('完整能力标签', fullText), { className: 'locker-empty-skill' }));
        else player[key].forEach(id => row.append(button(skillLabel(id), 'lineup-inspect-skills', () => inspect('完整能力标签', fullText), { className: 'locker-chip', data: { skill: id, type: key } })));
        return row;
      };
      detail.replaceChildren(top, traits, skillsRow('strengths', '擅长'), skillsRow('weaknesses', '弱项'));
    }
    updateDetail(focusedIndex);
    lockerRoom = createLockerRoom({ document, profile, selectedIndex: focusedIndex, disabled: model.pending || model.externalBusy,
      renderJersey: (player, index) => jersey(player, profile.nbaTeamId, index, true), getName: playerName,
      renderBadge: () => crest(profile),
      onChange(id, index) { selectedByProfile.set(profile.id, id); updateDetail(index); },
      onInspect(player, index) { inspect('柜位球员', `${playerName(player, index)}\n球衣 ${player.number} 号`); }
    });
    const actions = node('div', 'lineup-profile-actions');
    actions.append(button('查看进攻推荐', 'lineup-recommend', () => {
      model.route = 'recommendations'; model.recommendationIndex = 0; model.recommendationSection = 'reasons'; model.textPage = 0; draw();
    }, { className: 'button button-primary', data: { profileId: profile.id } }));
    actions.append(button(dirty(profile.id) ? '继续未保存配置' : '配置球员', 'lineup-configure', () => beginEdit(profile), { data: { profileId: profile.id } }));
    card.append(cardHeading, top, lockerRoom.element, detail, actions); root.append(card);
  }
 function destroyLocker(){lockerRoom?.destroy();lockerRoom=null;}
 return {profilePageView, destroyLocker};
}
