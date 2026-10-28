(() => {
  'use strict';
  const $ = id => document.getElementById(id), params = new URLSearchParams(location.search);
  const screen = $('app-screen'), dialog = $('account-dialog'), panel = dialog.querySelector('.account-panel');
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  const teams = { GSW: { name: '周末三人组', mode: '3v3', nba: '勇士' }, BOS: { name: '下班四人组', mode: '4v4', nba: '凯尔特人' } };
  const model = { demoState: 'guest', modal: null, activeTeamId: 'GSW', view: 'account' };
  let phase = 'closed', timer = null, generation = 0, trigger = null, returnToLogin = false;
  const guarded = new Map();
  if (params.get('embedded') === '1') document.body.classList.add('embedded');
  function state() { return { ...model, phase, visible: dialog.dataset.visible === 'true', reducedMotion: media.matches }; }
  function measure() {
    const r = screen.getBoundingClientRect(), wide = r.width >= 600 && r.height <= 600;
    screen.dataset.layout = r.width >= 900 && r.height > 600 ? 'tablet' : wide ? 'wide' : r.height < 500 ? 'short' : r.height <= 700 ? 'compact' : 'portrait';
    for (const [key, value] of Object.entries({ left: r.left, top: r.top, width: r.width, height: r.height })) dialog.style.setProperty(`--stage-${key}`, `${value}px`);
    dialog.dataset.compact = String(r.height <= 700); dialog.dataset.short = String(r.height < 500); dialog.dataset.wide = String(wide || r.width >= 900);
  }
  function render() {
    const member = model.demoState === 'member';
    $('account-name').textContent = member ? '阿泽' : '登录球搭';
    $('account-description').textContent = member ? '个人账号示例' : '备份球队，换机恢复';
    $('guest-avatar').toggleAttribute('hidden', member); $('member-avatar').hidden = !member; $('account-status').hidden = !member;
    $('account-primary').textContent = member ? '账号管理 ›' : '登录 / 注册';
    $('account-primary').dataset.action = member ? 'account-manage' : 'login-open';
    $('backup-status').textContent = member ? '备份状态示意 · 尚未接入' : '登录后可用 · 尚未接入';
    document.querySelectorAll('[data-demo-state]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.demoState === model.demoState)));
    document.querySelectorAll('.team-entry').forEach(card => {
      const current = card.dataset.teamId === model.activeTeamId; card.dataset.current = String(current);
      card.querySelector('.current-pill').hidden = !current;
      card.querySelector('.team-select').setAttribute('aria-pressed', String(current));
    });
    const account = model.view === 'account'; screen.dataset.view = model.view;
    for (const id of ['account-card', 'teams-card', 'tools-card']) $(id).hidden = !account;
    $('reference-view').hidden = account;
    const title = { account: '我的', lineups: '更衣室', play: '训练场', library: '战术库' }[model.view];
    $('page-title').textContent = title; $('page-subtitle').textContent = account ? '球队与账号' : '页面示意 · 不连接正式数据';
    const team = teams[model.activeTeamId];
    $('reference-title').textContent = model.view === 'lineups' ? team.name : title;
    $('reference-logo').src = `../../assets/nba/${model.activeTeamId}.svg`;
    $('reference-logo').hidden = model.view !== 'lineups';
    $('reference-description').textContent = model.view === 'lineups' ? `${team.mode} · ${team.nba}\n已在本预览中选择这支球队。\n这里仅示意从「我的」回到更衣室的路径。` : '本页仅展示导航方向。\n正式战术、回放和推荐不在此原型中运行。';
    document.querySelectorAll('[data-view-target]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.viewTarget === model.view)));
  }
  function isolate() {
    screen.querySelectorAll('button,input,select,textarea,a,[tabindex]').forEach(control => {
      if (!guarded.has(control)) guarded.set(control, { disabled: control.disabled, tabindex: control.getAttribute('tabindex') });
      if ('disabled' in control) control.disabled = true;
      control.tabIndex = -1;
    });
  }
  function restore() {
    for (const [control, prior] of guarded) {
      if (!control.isConnected) continue;
      if ('disabled' in control) control.disabled = prior.disabled;
      if (prior.tabindex === null) control.removeAttribute('tabindex'); else control.setAttribute('tabindex', prior.tabindex);
    }
    guarded.clear();
  }
  const focusable = () => [...panel.querySelectorAll('button,input,[tabindex]')].filter(node => !node.disabled && node.tabIndex !== -1 && !node.closest('[hidden]') && node.getClientRects().length);
  function focusFirst() { (focusable()[0] || panel).focus({ preventScroll: true }); dialog.scrollTop = 0; }
  function finishClose(restoreFocus = true) {
    clearTimeout(timer); generation++; delete dialog.dataset.visible; delete dialog.dataset.instant;
    if (dialog.open) { if (typeof dialog.close === 'function') dialog.close(); else dialog.removeAttribute('open'); }
    phase = 'closed'; dialog.dataset.phase = phase; screen.dataset.modalActive = 'false'; model.modal = null; restore();
    $('account-email').value = ''; $('account-password').value = ''; $('account-password').type = 'password';
    const visibility = dialog.querySelector('[data-action="password-toggle"]');
    visibility.setAttribute('aria-pressed', 'false'); visibility.setAttribute('aria-label', '显示密码');
    if (restoreFocus && trigger?.isConnected && !trigger.disabled && trigger.getClientRects().length) trigger.focus({ preventScroll: true });
    trigger = null;
  }
  function close() {
    if (phase === 'closed' || phase === 'closing') return;
    clearTimeout(timer); const ticket = ++generation; phase = 'closing'; dialog.dataset.phase = phase;
    delete dialog.dataset.visible; delete dialog.dataset.instant; screen.dataset.modalActive = 'false';
    panel.querySelectorAll('button,input').forEach(button => { button.disabled = true; });
    if (media.matches) finishClose(); else timer = setTimeout(() => { if (ticket === generation) finishClose(); }, 450);
  }
  function content(kind, options = {}) {
    model.modal = kind; const login = kind === 'login'; returnToLogin = Boolean(options.returnToLogin);
    $('modal-title').textContent = login ? '登录球搭' : options.title || '交互说明';
    $('modal-subtitle').textContent = login ? '把球队带到下一部手机' : '仅交互预览 · 尚未接入真实服务';
    $('login-form').hidden = !login; $('info-content').hidden = login;
    $('return-login').hidden = !returnToLogin;
    $('info-message').textContent = options.text || '';
    $('continue-local').textContent = login ? '继续本地使用' : '知道了，返回页面';
    $('login-feedback').textContent = '交互预览，账号服务尚未接入。请勿填写真实密码。';
    delete $('login-feedback').dataset.notice;
  }
  function open(kind, options = {}, instant = false) {
    if (phase === 'closing') finishClose(false);
    content(kind, options);
    if (phase === 'open' || phase === 'opening') { focusFirst(); return; }
    clearTimeout(timer); const ticket = ++generation; trigger = document.activeElement; measure();
    panel.querySelectorAll('button,input').forEach(button => { button.disabled = false; });
    phase = instant || media.matches ? 'open' : 'opening'; dialog.dataset.phase = phase;
    if (instant || media.matches) { dialog.dataset.instant = 'true'; dialog.dataset.visible = 'true'; }
    else delete dialog.dataset.visible;
    screen.dataset.modalActive = 'true'; isolate();
    if (!dialog.open) { if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', ''); }
    panel.focus({ preventScroll: true });
    if (phase === 'open') {
      focusFirst(); requestAnimationFrame(() => requestAnimationFrame(() => { if (ticket === generation) delete dialog.dataset.instant; }));
    } else requestAnimationFrame(() => requestAnimationFrame(() => {
      if (ticket !== generation || phase !== 'opening') return;
      dialog.dataset.visible = 'true'; focusFirst();
      timer = setTimeout(() => { if (ticket === generation && phase === 'opening') { phase = 'open'; dialog.dataset.phase = phase; } }, 450);
    }));
  }
  function setState(value) {
    if (!['guest', 'member', 'login'].includes(value)) return state();
    finishClose(false); model.demoState = value; model.view = 'account'; render();
    if (value === 'login') open('login', {}, true);
    return state();
  }
  function info(kind, title, text, fromLogin = false) { open(kind, { title, text, returnToLogin: fromLogin }); }
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-demo-state],[data-action],[data-view-target]');
    if (!button || button.disabled || phase === 'closing') return;
    if (button.dataset.demoState) { setState(button.dataset.demoState); return; }
    if (button.dataset.viewTarget) { if (phase !== 'closed') return; model.view = button.dataset.viewTarget; render(); return; }
    const action = button.dataset.action, team = teams[button.dataset.teamId];
    switch (action) {
      case 'login-open': open('login'); break;
      case 'account-manage': info('account', '账号管理', '阿泽 · 个人账号示例\n真实账号服务尚未接入。\n后续用于备份自己的球队、换手机恢复；\n本预览没有登录凭据或远端账号。'); break;
      case 'modal-close': case 'continue-local': close(); break;
      case 'team-select': if (team) { model.activeTeamId = button.dataset.teamId; model.view = 'lineups'; render(); } break;
      case 'team-manage': if (team) info('team', team.name, `${team.mode} · ${team.nba}\n球队管理仅作交互示意。\n这里不修改正式球队，也不切换当前球队。`); break;
      case 'teams-manage': info('teams', '管理我的球队', '球队档案与个人账号分开管理。\n本页两支球队都是内存示例。\n点球队进入更衣室示意，点「⋯」查看该队说明。'); break;
      case 'team-create': info('create', '创建一支球队', '创建任务示意\n① 填写名称与3v3 / 4v4人数\n② 选择NBA球队与球衣\n③ 配置队员资料、体型与能力标签\n本预览不会保存新球队。'); break;
      case 'backup-open': info('backup', '同步与备份', '备份状态示意 · 账号服务尚未接入\n个人账号用于备份球队、换手机恢复。\n本原型不上传、不下载，也不覆盖本机球队。\n真实认证与恢复流程仍需后续设计。'); break;
      case 'settings-open': info('settings', '设置', '设置入口示意\n正式App的偏好设置继续在本机使用。\n这个独立原型不读取或更改任何设置。'); break;
      case 'about-open': info('about', '关于球搭', '球搭 · HOOPAL\n与熟悉的队友，把配合练得更默契。\n这是「我的」与账号备份的交互原型，\n不是已接入账号服务的正式版本。'); break;
      case 'register-open': info('register', '注册账号', '注册交互预览\n真实认证方式与账号服务尚未确定，\n本页不会注册账号或收集输入。', true); break;
      case 'recover-open': info('recover', '找回密码', '找回流程预览\n尚未接入账号服务，不能发送验证码或重置密码。\n请勿在此填写真实凭据。', true); break;
      case 'return-login': content('login'); focusFirst(); break;
      case 'return-account': model.view = 'account'; render(); break;
      case 'password-toggle': {
        const input = $('account-password'), shown = input.type === 'password'; input.type = shown ? 'text' : 'password';
        button.setAttribute('aria-pressed', String(shown)); button.setAttribute('aria-label', shown ? '隐藏密码' : '显示密码'); break;
      }
    }
  });
  $('login-form').addEventListener('submit', event => {
    event.preventDefault(); $('login-feedback').textContent = '交互预览，尚未接入账号服务。此次输入未发送，也不会变成已登录状态。'; $('login-feedback').dataset.notice = 'true';
  });
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  document.addEventListener('keydown', event => {
    if (phase === 'closed') return;
    if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); close(); }
    else if (event.key === 'Tab') {
      const items = focusable(), index = items.indexOf(document.activeElement);
      if (!items.length) { event.preventDefault(); panel.focus({ preventScroll: true }); }
      else if (event.shiftKey && index <= 0) { event.preventDefault(); items.at(-1).focus({ preventScroll: true }); }
      else if (!event.shiftKey && (index < 0 || index === items.length - 1)) { event.preventDefault(); items[0].focus({ preventScroll: true }); }
    }
  }, true);
  document.addEventListener('focusin', event => { if (phase !== 'closed' && !dialog.contains(event.target)) focusFirst(); }, true);
  const guard = event => { if (phase !== 'closed' && screen.contains(event.target)) { event.preventDefault(); event.stopImmediatePropagation(); } };
  for (const type of ['click', 'pointerdown', 'touchstart']) document.addEventListener(type, guard, { capture: true, passive: false });
  addEventListener('resize', measure); window.visualViewport?.addEventListener('resize', measure);
  if (typeof ResizeObserver === 'function') new ResizeObserver(measure).observe(screen);
  const reduce = () => { if (!media.matches) return; if (phase === 'closing') finishClose(); else if (phase === 'opening') { clearTimeout(timer); generation++; phase = 'open'; dialog.dataset.phase = phase; dialog.dataset.visible = 'true'; } };
  if (media.addEventListener) media.addEventListener('change', reduce); else media.addListener?.(reduce);
  measure(); setState(params.get('state') || 'guest');
  const ready = Promise.all([document.fonts?.ready, ...[...document.images].map(image => image.complete ? Promise.resolve() : new Promise(resolve => { image.addEventListener('load', resolve, { once: true }); image.addEventListener('error', resolve, { once: true }); }))]).then(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))).then(() => { measure(); return state(); });
  window.accountPreview = { ready, setState, state };
})();
