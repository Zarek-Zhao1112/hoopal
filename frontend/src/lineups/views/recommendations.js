import { createTacticPreview } from '../../board/court-renderer.js';
import { templates } from '../../../../shared/templates.js';
import { playerName } from './text.js';
import { splitLineupText } from './text.js';

/** A feature-owned view, using the coordinator's explicit state and callbacks. */
export function createRecommendationsView(context){
 const {active,model,profilePageView,header,button,beginEdit,node,crest,root,dirty,notice,draw,document,jersey,pager,perform}=context;

 function recommendationsPageView() {
    const profile = active();
    if (!profile) { model.route = 'profiles'; profilePageView(); return; }
    header('进攻推荐', `${profile.name} · ${profile.mode}`, true, button('配置', 'lineup-reconfigure', () => beginEdit(profile)));
    if (!model.results.ready || !model.results.recommendations?.length) {
      const empty = node('div', 'lineup-empty');
      empty.append(crest(profile), node('h2', '', model.results.ready ? '暂时没有适合的候选' : '还差一点，就能开始推荐'), node('p', '', model.results.message || '请为每名队员明确选择身高、体格和移动特点。能力可以全部按一般处理。'));
      empty.append(button('继续配置球员', 'lineup-complete', () => beginEdit(profile), { className: 'button button-primary' })); root.append(empty); return;
    }
    if (dirty(profile.id)) notice('有未保存配置；当前推荐按已保存的阵容生成。');
    model.recommendationIndex = Math.max(0, Math.min(model.results.recommendations.length - 1, model.recommendationIndex));
    const result = model.results.recommendations[model.recommendationIndex];
    const candidateTabs = node('div', 'lineup-recommendation-tabs');
    model.results.recommendations.forEach((candidate, index) => candidateTabs.append(button(candidate.title, 'lineup-candidate', () => { model.recommendationIndex = index; model.textPage = 0; draw(); }, { pressed: index === model.recommendationIndex, data: { templateId: candidate.templateId }, title: candidate.title })));
    root.append(candidateTabs);
    const card = node('article', 'lineup-recommendation-card');
    const top = node('div', 'lineup-recommendation-top');
    top.append(node('h2', '', result.title), node('span', 'lineup-fit', result.fit === 'conditional' ? '有条件备选' : '适合尝试'));
    card.append(top, createTacticPreview({document,template:templates.find(item=>item.id===result.templateId)}));
    const tabs = node('div', 'lineup-section-tabs');
    for (const [id, label] of [['summary', '特点'], ['reasons', '理由'], ['assignments', '分工'], ['cautions', '提醒']]) tabs.append(button(label, 'lineup-detail', () => { model.recommendationSection = id; model.textPage = 0; draw(); }, { pressed: model.recommendationSection === id, data: { section: id } }));
    card.append(tabs);
    let entries;
    if (model.recommendationSection === 'summary') entries = [model.results.message, ...(model.results.summary || [])].filter(Boolean).map(text => ({ text }));
    else if (model.recommendationSection === 'assignments') entries = (result.assignments || []).map(assignment => {
      const index = profile.players.findIndex(member => member.id === assignment.playerId), player = profile.players[index];
      return { title: `职责 ${assignment.role} · ${playerName(player, Math.max(0, index))} · 球衣 ${player?.number ?? '—'} 号`, text: assignment.task, player, index };
    });
    else entries = [...(model.recommendationSection === 'cautions' && model.results.message ? [model.results.message] : []), ...(result[model.recommendationSection] || [])].map(text => ({ text: typeof text === 'string' ? text : text.message || text.reason || JSON.stringify(text) }));
    const pages = entries.flatMap(entry => splitLineupText(entry.text, 70, 3).map(text => ({ ...entry, text })));
    if (!pages.length) pages.push({ text: model.recommendationSection === 'cautions' ? '按内置讲解练习，注意队友间距与配合时机。' : '此项暂无补充说明。' });
    model.textPage = Math.max(0, Math.min(pages.length - 1, model.textPage));
    const detail = node('div', 'lineup-recommendation-detail'), entry = pages[model.textPage];
    if (entry.player) {
      detail.className += ' has-player';
      detail.append(jersey(entry.player, profile.nbaTeamId, entry.index, true));
    }
    if (entry.title) detail.append(node('strong', '', entry.title));
    detail.append(node('p', '', entry.text));
    card.append(detail, pager(pages.length, model.textPage, page => { model.textPage = page; draw(); }, 'lineup-detail'));
    root.append(card, button('▶ 按本队分工演练', 'lineup-play', () => perform('play', { templateId: result.templateId }), { className: 'button button-primary lineup-bottom-action', data: { templateId: result.templateId } }));
  }

 return {recommendationsPageView};
}
