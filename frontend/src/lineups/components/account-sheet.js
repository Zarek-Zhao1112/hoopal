import { createLineupSheet } from './sheet.js';

const CONTENT = Object.freeze({
  settings: {
    title: '本机使用', subtitle: '随时打开，离线练配合',
    message: '球队档案、队员资料、球场角色、外观偏好与战术进度保存在这台设备上。\n\n在更衣室编辑当前球员，在训练场按本队号码演练 3v3 / 4v4 内置战术。\n\n可以调整播放速度、查看步骤讲解，并导出战术图片或 JSON。',
  },
  about: {
    title: '关于球搭', subtitle: 'HOOPAL · 与熟悉的队友练好配合',
    message: `球搭是一款本机离线的半场篮球战术工具。\n\n支持 3v3 / 4v4 球队管理、球员主副角色、内置攻防战术与本队号码演练。\n\n版本 ${__APP_VERSION__}`,
  },
});

/** Read-only local information using the shared modal behavior. */
export function createAccountSheet({ document, onModalChange, isBlocked = () => false }) {
  const sheet = createLineupSheet({ document, id: 'lineup-account-dialog', labelledBy: 'lineup-account-title', onRequestClose: () => sheet.close(), onModalChange });
  sheet.dialog.classList.add('lineup-account-dialog');
  sheet.dialog.dataset.phase = 'closed';
  sheet.dialog.setAttribute('aria-labelledby', 'lineup-account-title');
  sheet.panel.classList.add('lineup-account-sheet');
  const node = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  };
  function open(kind, trigger) {
    if (isBlocked() || sheet.isOpen || !CONTENT[kind]) return false;
    const content = CONTENT[kind];
    sheet.rememberTrigger(trigger || document.activeElement);
    const heading = node('header', 'lineup-account-sheet-heading'), title = node('div');
    const h2 = node('h2', '', content.title); h2.id = 'lineup-account-title';
    title.append(h2, node('p', '', content.subtitle));
    const close = node('button', 'lineup-account-sheet-close', '×');
    close.type = 'button'; close.dataset.action = 'lineup-account-close'; close.setAttribute('aria-label', '关闭说明');
    close.addEventListener('click', () => sheet.close()); heading.append(title, close);
    const body = node('section', 'lineup-account-sheet-body');
    const badge = node('span', 'lineup-account-availability', kind === 'settings' ? '本机离线可用' : '球搭 · HOOPAL');
    body.append(badge, node('p', '', content.message));
    const local = node('button', 'button button-primary lineup-account-local', '知道了');
    local.type = 'button'; local.dataset.action = 'lineup-account-local'; local.addEventListener('click', () => sheet.close());
    sheet.panel.replaceChildren(heading, body, local);
    sheet.dialog.dataset.kind = kind;
    sheet.open(); return true;
  }
  return {
    open, dialog: sheet.dialog,
    refreshIsolation: sheet.refreshIsolation,
    handleBack() { if (!sheet.isOpen) return false; sheet.close(); return true; },
    get isOpen() { return sheet.isOpen; },
  };
}
