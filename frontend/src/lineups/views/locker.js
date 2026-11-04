import { createEmptyLocker } from '../components/locker-room.js';
import { isLineupReady } from '../../../../shared/lineups.js';
import { playerName } from './text.js';
import { createLockerRoom } from '../components/locker-room.js';

/** A feature-owned view, using the coordinator's explicit state and callbacks. */
export function createLockerView(context){
 const {header,button,navigate,root,active,node,model,document,inspect,crest,selectedByProfile,jersey,beginEdit}=context;
 let lockerRoom=null;
 function profilePageView() {
    header('更衣室', '', false, button('换球队 ›', 'lineup-switch-archive', () => navigate('archives'), { className: 'button button-subtle' }));
    const cardHeading = root.lastElementChild; cardHeading.remove();
    const profile = active();
    if (!profile) {
      const empty = node('article', 'lineup-empty lineup-main-empty');
      empty.append(cardHeading, node('h2', '', model.state.profiles.length ? '选一支球队，进入更衣室' : '先组一支自己的球队'), createEmptyLocker({ document }), node('p', '', '球队的创建与管理，都在「我的」中。'));
      empty.append(button(model.state.profiles.length ? '去我的选择球队' : '去我的创建球队', 'lineup-open-archives', () => navigate('archives'), { className: 'button button-primary' }));
      root.append(empty); return;
    }
    const card = node('article', 'lineup-profile-card'); card.dataset.color = profile.color; card.dataset.mode = profile.mode;
    const top = node('div', 'lineup-profile-top');
    const title = node('div', 'lineup-profile-title');
    const name = node('h2');
    name.append(button(profile.name, 'lineup-inspect-profile', () => inspect('阵容名称', profile.name), { className: 'lineup-text-link' }));
    title.append(name, node('p', '', `${profile.mode} · ${isLineupReady(profile) ? '已配置' : '待完善'}`));
    top.append(crest(profile), title);
    let focusedIndex = profile.players.findIndex(player => player.id === selectedByProfile.get(profile.id));
    if (focusedIndex < 0) focusedIndex = 0;
    selectedByProfile.set(profile.id, profile.players[focusedIndex].id);
    lockerRoom = createLockerRoom({ document, profile, swipeSurface: card, selectedIndex: focusedIndex, disabled: model.pending || model.externalBusy,
      renderJersey: (player, index) => jersey(player, profile.nbaTeamId, index, true), getName: playerName,
      renderBadge: () => crest(profile),
      onChange(id) { selectedByProfile.set(profile.id, id); },
      onInspect(player, index) { inspect('柜位球员', `${playerName(player, index)}\n球衣 ${player.number} 号`); }
    });
    const actions = node('div', 'lineup-profile-actions');
    actions.append(button('挑选战术', 'lineup-conditions', () => navigate('roles'), { className: 'button button-primary', data: { profileId: profile.id } }));
    actions.append(button('编辑球员', 'lineup-configure', () => beginEdit(profile, selectedByProfile.get(profile.id), { singlePlayer: true }), { data: { profileId: profile.id } }));
    card.append(cardHeading, top, lockerRoom.element, actions); root.append(card);
  }
 function destroyLocker(){lockerRoom?.destroy();lockerRoom=null;}
 return {profilePageView, destroyLocker};
}
