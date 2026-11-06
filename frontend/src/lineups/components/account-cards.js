function icon(document, kind) {
  const ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('class', 'lineup-account-icon');
  const paths = {
    settings: 'M10 3h4l1 3 3 1 3 3-2 3v4l-4 1-1 3h-4l-1-3-3-1-3-3 2-3V7l4-1ZM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z',
    info: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20ZM12 10v7M12 6v1',
  };
  const path = document.createElementNS(ns, 'path'); path.setAttribute('d', paths[kind]); svg.append(path); return svg;
}

/** Local information entries; no identity or service state. */
export function createAccountCards({ document, node, button, openAccount }) {
  function entry(label, action, kind, options) {
    let element;
    element = button(label, action, () => openAccount(kind, element), options);
    return element;
  }
  function tools() {
    const card = node('section', 'lineup-account-tools lineup-account-glass'); card.setAttribute('aria-label', '本机使用与关于');
    for (const [kind, label, action, picture, detail] of [
      ['settings', '本机使用', 'lineup-settings-open', 'settings', '球队资料与外观偏好保存在本机'],
      ['about', '关于球搭', 'lineup-about-open', 'info', `HOOPAL · ${__APP_VERSION__}`],
    ]) {
      const row = entry('', action, kind, { className: 'lineup-account-tool' });
      const copy = node('span', 'lineup-account-tool-copy'); copy.append(node('strong', '', label));
      if (detail) copy.append(node('small', '', detail));
      row.append(icon(document, picture), copy, node('span', 'lineup-account-tool-arrow', '›')); card.append(row);
    }
    return card;
  }
  return { tools };
}
