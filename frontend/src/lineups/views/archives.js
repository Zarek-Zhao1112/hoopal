import { getNbaTeam } from '../../../../data/nba-teams.js';
import { playerName } from './text.js';

/** A feature-owned view, using the coordinator's explicit state and callbacks. */
export function createArchivesView(context){
 const {node,model,button,navigate,perform,crest,openArchiveMenu,pager,draw,draftStore,beginCreate,root}=context;

 function archivesPageView() {
    const card = node('section', 'lineup-archives-card');
    const heading = node('header', 'lineup-archives-heading');
    heading.append(node('h1', '', '球队档案'), node('span', '', `${model.state.profiles.length} / 20`));
    card.append(heading, node('p', 'lineup-archives-intro', '点球队卡片，进入它的更衣室'));
    const list = node('div', 'lineup-archive-list');
    const pages = Math.max(1, Math.ceil(model.state.profiles.length / 3));
    model.profilePage = Math.max(0, Math.min(pages - 1, model.profilePage));
    if (!model.state.profiles.length) {
      const empty = node('div', 'lineup-archives-empty');
      empty.append(node('h2', '', '还没有球队档案'), node('p', '', '从球队名字、喜欢的球衣开始，\n再为队员选好真实特点。'));
      list.append(empty);
    }
    for (const profile of model.state.profiles.slice(model.profilePage * 3, model.profilePage * 3 + 3)) {
      const item = node('article', 'lineup-archive-card');
      item.dataset.profileId = profile.id; item.dataset.teamId = profile.nbaTeamId || ''; item.dataset.current = String(profile.id === model.state.activeProfileId);
      const select = button('', 'lineup-select', () => {
        if (profile.id === model.state.activeProfileId) { navigate('lineups'); return; }
        return perform('select', { id: profile.id }, () => navigate('lineups'));
      }, { className: 'lineup-archive-select', data: { profileId: profile.id } });
      select.setAttribute('aria-label', `使用${profile.name}，${profile.mode}，进入更衣室`);
      if (profile.id === model.state.activeProfileId) select.setAttribute('aria-current', 'true');
      const identity = node('div', 'lineup-archive-copy');
      identity.append(node('h2', '', profile.name), node('p', '', `${profile.mode} · ${getNbaTeam(profile.nbaTeamId)?.name || '未选择 NBA 球队'}`));
      const members = node('div', 'lineup-archive-members');
      for (const [index, member] of profile.players.entries()) {
        const summary = node('span'); summary.append(node('i', '', member.number), node('span', '', playerName(member, index))); members.append(summary);
      }
      identity.append(members); select.append(crest(profile), identity, node('span', 'lineup-archive-enter', '›'));
      let manage;
      manage = button('⋯', 'lineup-archive-menu', () => openArchiveMenu(profile.id, manage), { className: 'lineup-archive-manage', title: `管理${profile.name}`, data: { profileId: profile.id } });
      item.append(select, manage);
      if (profile.id === model.state.activeProfileId) item.append(node('span', 'lineup-archive-current', '当前使用'));
      list.append(item);
    }
    card.append(list);
    if (pages > 1) { card.classList.add('has-pages'); card.append(pager(pages, model.profilePage, page => { model.profilePage = page; model.feedback = ''; draw(); }, 'lineup-archives')); }
    card.append(button(draftStore.createDraft ? '继续创建球队' : '＋ 创建球队', model.state.profiles.length ? 'lineup-create' : 'lineup-create-empty', beginCreate, { className: 'button button-primary lineup-archive-create', disabled: model.state.profiles.length >= 20 }));
    root.append(card);
  }

 return {archivesPageView};
}
