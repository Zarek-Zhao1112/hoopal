/** Presentation only: the app owns playback, persistence and step navigation. */
export function createTrainingView({ document, onSelectStep }) {
  const byId = id => document.getElementById(id);
  const text = (id, value) => {
    const node = byId(id);
    if (node && node.textContent !== value) node.textContent = value;
  };
  function renderSteps(frames, index) {
    const list = byId('frame-list');
    list.style.setProperty('--training-steps', String(frames.length));
    list.replaceChildren(...frames.map((frame, i) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `frame-item${i === index ? ' active' : ''}${i < index ? ' is-complete' : ''}`;
      button.dataset.frameIndex = String(i);
      button.setAttribute('aria-current', i === index ? 'step' : 'false');
      const label = frame.note.split(/[：。\n]/u)[0] || `步骤 ${i + 1}`;
      button.title = `第 ${i + 1} 步：${label}`;
      button.setAttribute('aria-label', button.title);
      const number = document.createElement('span');
      number.className = 'frame-number';
      number.textContent = String(i + 1);
      button.append(number);
      button.addEventListener('click', () => onSelectStep(i));
      return button;
    }));
  }
  function render({ title, note, playing }) {
    text('training-title', title);
    const heading = (note || '准备站位').split(/[，,:：.。\n]/u)[0].trim() || '准备站位';
    const headingCharacters = Array.from(heading);
    text('training-step-title', headingCharacters.slice(0, 14).join('') + (headingCharacters.length > 14 ? '…' : ''));
    byId('training-step-title').title = heading;
    // The full unchanged note remains available through the existing dialog.
    const characters = Array.from(note || '这一步暂无讲解。');
    text('live-step-note', characters.slice(0, 72).join('') + (characters.length > 72 ? '…' : ''));
    const button = byId('play-toggle');
    const href = playing ? '#i-pause' : '#i-play';
    const icon = button.querySelector('use');
    if (icon.getAttribute('href') !== href) icon.setAttribute('href', href);
    const label = playing ? '暂停战术' : '播放战术';
    button.setAttribute('aria-label', label);
    button.setAttribute('aria-pressed', String(playing));
  }
  return { render, renderSteps };
}
