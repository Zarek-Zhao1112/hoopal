import { getNbaTeam } from '../../../../data/nba-teams.js';
import { playerName } from './text.js';
import { createAccountCards } from '../components/account-cards.js';

/** A feature-owned view, using the coordinator's explicit state and callbacks. */
export function createArchivesView(context){
 const {node,model,button,navigate,perform,crest,openArchiveMenu,pager,draw,draftStore,beginCreate,root,document,openAccount}=context;
 const account = createAccountCards({document,node,button,openAccount});

 function archivesPageView() {
    if (model.route === 'teams') { teamsPageView(); return; }
    const card = node('section', 'lineup-archives-card lineup-account-page');
    card.append(node('h1', 'workspace-card-heading', '我的'), account.identity());
    const teams = node('section', 'lineup-account-teams lineup-account-glass lineup-team-overview');
    const top = node('header', 'lineup-account-teams-heading'), title = node('div');
    title.append(node('h2', '', '我的球队'), node('span', 'lineup-teams-count', `${model.state.profiles.length} / 20`)); top.append(title); teams.append(top);
    const active = model.state.profiles.find(profile => profile.id === model.state.activeProfileId);
    const summary = node('div', 'lineup-team-overview-copy');
    if (active) {
      summary.append(crest(active));
      const copy = node('div'); copy.append(node('strong', '', active.name), node('p', '', `${active.mode} · ${active.players.length}名队员 · 当前使用`)); summary.append(copy);
    } else {
      const copy = node('div'); copy.append(node('strong', '', model.state.profiles.length ? '选一支球队，开始配合' : '先组一支自己的球队'), node('p', '', model.state.profiles.length ? '球队配置与队员资料都保存在本机。' : '从名字和喜欢的球衣开始。')); summary.append(copy);
    }
    teams.append(summary);
    if (draftStore.createDraft) { teams.classList.add('has-create-draft'); teams.append(node('p', 'lineup-team-draft-hint', '有一份未完成的建队草稿，可到球队管理继续。')); }
    teams.append(button('管理球队 ›', 'teams-open', () => {
      model.route = 'teams'; model.feedback = ''; draw();
      document.defaultView?.requestAnimationFrame(() => root.querySelector('[data-action="teams-back"]')?.focus({ preventScroll: true }));
    }, { className: 'button button-primary lineup-teams-open' }));
    card.append(teams, account.tools()); root.append(card);
  }

 function teamsPageView() {
    const head = node('header', 'lineup-secondary-heading'); head.id = 'team-management-header';
    const back = button('‹', 'teams-back', () => {
      model.route = 'profiles'; model.feedback = ''; draw();
      document.defaultView?.requestAnimationFrame(() => root.querySelector('[data-action="teams-open"]')?.focus({ preventScroll: true }));
    }, { className: 'icon-button', title: '返回我的' }); back.setAttribute('aria-label', '返回我的');
    const copy = node('div'); copy.append(node('h1', '', '球队管理'), node('p', '', `本机档案 · ${model.state.profiles.length}支球队`)); head.append(back, copy); root.append(head);
    const card = node('section', 'lineup-teams-page'); card.id = 'team-management-card'; card.setAttribute('aria-label', '我的球队列表');
    const teams = node('section', 'lineup-account-teams lineup-account-glass');
    const teamHeading = node('header', 'lineup-account-teams-heading'), teamTitle = node('div');
    teamTitle.append(node('h2', '', '我的球队'), node('span', 'lineup-teams-count', `${model.state.profiles.length} / 20`));
    teamHeading.append(teamTitle); teams.append(teamHeading);
    const list = node('div', 'lineup-archive-list');
    const pages = Math.max(1, Math.ceil(model.state.profiles.length / 3));
    model.profilePage = Math.max(0, Math.min(pages - 1, model.profilePage));
    if (!model.state.profiles.length) {
      const empty = node('div', 'lineup-archives-empty');
      empty.append(node('h2', '', '还没有球队档案'), node('p', '', '从球队名字、喜欢的球衣开始，\n再为队友填好昵称和号码。'));
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
    teams.append(list);
    if (pages > 1) { card.classList.add('has-pages'); teamHeading.append(pager(pages, model.profilePage, page => { model.profilePage = page; model.feedback = ''; draw(); }, 'lineup-archives')); }
    teams.append(button(draftStore.createDraft ? '继续创建球队' : '＋ 创建球队', model.state.profiles.length ? 'lineup-create' : 'lineup-create-empty', beginCreate, { className: 'button button-primary lineup-archive-create', disabled: model.state.profiles.length >= 20 }));
    card.append(teams);
    root.append(card);
  }

 return {archivesPageView};
}
