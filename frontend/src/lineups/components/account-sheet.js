import { createLineupSheet } from './sheet.js';

const CONTENT = Object.freeze({
  account: {
    title: '个人账号', subtitle: '备份球队，换手机恢复',
    message: '账号功能尚未开放。\n\n今后可使用个人账号备份自己的球队，并在换手机时恢复。\n\n现在仍可在本机管理球队、查看推荐和演练战术。',
  },
  backup: {
    title: '同步与备份', subtitle: '球队资料留在这台设备上',
    message: '云端备份与换机恢复尚未开放。\n\n当前球队档案保存在本机，不会自动上传或从其他设备恢复。\n\n请继续使用本机球队；本页不会更改已有资料。',
  },
  settings: {
    title: '本机使用', subtitle: '无需账号，也能离线练配合',
    message: '球队档案、队员特点和战术进度保存在本机。\n\n可以在训练场调整播放速度、查看讲解，并导出战术图片或 JSON。\n\n账号与云端备份尚未开放。',
  },
  about: {
    title: '关于球搭', subtitle: 'HOOPAL · 与熟悉的队友练好配合',
    message: '球搭是一款本机离线的半场篮球战术工具。\n\n支持 3v3 / 4v4 球队、队员特点、进攻推荐与内置战术演练。\n\n账号与云端备份功能尚未开放，本机使用不受影响。',
  },
});

/** Honest service information. It has no account state, credentials or persistence. */
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
    const badge = node('span', 'lineup-account-availability', kind === 'settings' ? '本机离线可用' : kind === 'about' ? '球搭 · HOOPAL' : '尚未开放');
    body.append(badge, node('p', '', content.message));
    const local = node('button', 'button button-primary lineup-account-local', '继续本地使用');
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
