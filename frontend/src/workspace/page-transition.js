import { SOFT_GLOW_DURATION, SOFT_GLOW_FEATHER, sampleSoftGlow } from './soft-glow.js';
const MASK_TEST = 'radial-gradient(circle 1px at 1px 1px, transparent 1px, #000 2px)';

/** Farthest corner, with a pixel allowance for mask antialiasing. */
export function revealGeometry(rect, width, height) {
  const x = Math.max(0, Math.min(width, rect.left + rect.width / 2));
  const y = Math.max(0, Math.min(height, rect.top + rect.height / 2));
  return { x, y, radius: Math.hypot(Math.max(x, width - x), Math.max(y, height - y)) + 2 };
}

function remapReferences(value, ids) {
  if (value.startsWith('#') && ids.has(value.slice(1))) return `#${ids.get(value.slice(1))}`;
  return value.replace(/url\(\s*(['"]?)#([^\s)'"\]]+)\1\s*\)/g, (match, quote, id) => ids.has(id) ? `url(#${ids.get(id)})` : match);
}

/** Keep stylesheet URLs relative to their original CSS file, not this shadow style. */
export function resolveCssUrls(css, base) {
  return css.replace(/url\(\s*(['"]?)([^)'"\s]+)\1\s*\)/g, (match, quote, value) => {
    if (/^(#|data:|blob:)/i.test(value)) return match;
    return `url("${new URL(value, base).href.replaceAll('"', '%22')}")`;
  });
}

function collectStyles(document) {
  const read = sheet => {
    const base = sheet.href || document.baseURI;
    return [...sheet.cssRules].map(rule => {
      if (rule.type === 3) {
        const text = read(rule.styleSheet);
        return rule.media?.mediaText && rule.media.mediaText !== 'all' ? `@media ${rule.media.mediaText}{${text}}` : text;
      }
      return resolveCssUrls(rule.cssText, base);
    }).join('\n');
  };
  const text = [...document.styleSheets].map(read).join('\n');
  if (!text) throw new Error('No styles available for page transition');
  return text;
}

/**
 * Only the old visual tree is copied. The actual destination and navigation
 * remain live, unclipped and synchronous. A closed shadow boundary prevents
 * application selectors from finding the snapshot. IDs are also remapped.
 */
export function createPageTransition({ document = globalThis.document, duration = SOFT_GLOW_DURATION } = {}) {
  const window = document.defaultView;
  const body = document.body;
  const motion = window?.matchMedia?.('(prefers-reduced-motion: reduce)');
  const clock = () => window?.performance?.now?.() ?? Date.now();
  let active = null, frame = null, timeout = null, sequence = 0, cachedStyles = null;

  function cleanup(reason = 'cancelled') {
    if (frame !== null) window?.cancelAnimationFrame?.(frame);
    if (timeout !== null) window?.clearTimeout?.(timeout);
    frame = null; timeout = null;
    const previous = active; active = null;
    previous?.host.remove(); previous?.glow.remove();
    delete body.dataset.pageTransition;
    body.dataset.pageTransitionLastReason = reason;
  }
  function supported() {
    const css = window?.CSS;
    return !motion?.matches && !document.hidden && Boolean(window?.requestAnimationFrame && window?.cancelAnimationFrame && window?.setTimeout && css?.supports?.('-webkit-mask-image', MASK_TEST));
  }
  function prepare({ from, to }) {
    cleanup('superseded');
    if (from === to || !supported() || document.querySelector('dialog[open]')) return null;
    const started = clock();
    let host, glow;
    try {
      cachedStyles ??= collectStyles(document);
      const clone = body.cloneNode(true);
      const originals = [...body.querySelectorAll('input,textarea,select')];
      const controls = [...clone.querySelectorAll('input,textarea,select')];
      controls.forEach((copy, index) => {
        const original = originals[index];
        if (!original) return;
        copy.value = original.value;
        if ('checked' in original) copy.checked = original.checked;
        if ('selectedIndex' in original) copy.selectedIndex = original.selectedIndex;
      });
      // Synchronize controls before removing dialogs so positional pairing holds.
      for (const node of clone.querySelectorAll('script,style,link,dialog,[data-page-transition],.toast')) node.remove();
      const ids = new Map(), prefix = `page-snapshot-${++sequence}-`;
      for (const node of clone.querySelectorAll('[id]')) ids.set(node.id, prefix + node.id);
      let nodes = 1;
      for (const node of [clone, ...clone.querySelectorAll('*')]) {
        nodes++;
        for (const attribute of [...node.attributes]) {
          const key = attribute.name;
          if (/^on/i.test(key) || key === 'autofocus' || key === 'contenteditable') node.removeAttribute(key);
          else if (key === 'id') node.id = ids.get(attribute.value);
          else if (['for', 'aria-labelledby', 'aria-describedby', 'aria-controls', 'aria-owns', 'headers'].includes(key)) node.setAttribute(key, attribute.value.split(/\s+/).map(id => ids.get(id) || id).join(' '));
          else node.setAttribute(key, remapReferences(attribute.value, ids));
        }
        if (node.matches('button,input,select,textarea,fieldset,option,optgroup')) {
          if (!node.disabled) node.dataset.snapshotEnabled = '';
          node.disabled = true;
        }
        if (node.matches('a,button,input,select,textarea,summary,[tabindex],[contenteditable],audio,video,iframe')) node.setAttribute('tabindex', '-1');
        if (node.matches('audio,video')) { node.removeAttribute('autoplay'); node.removeAttribute('controls'); }
      }
      const css = cachedStyles.replace(/#([a-zA-Z_][\w-]*)/g, (match, id) => ids.has(id) ? `#${ids.get(id)}` : match);
      host = document.createElement('div');
      host.className = 'page-transition-layer'; host.dataset.pageTransition = 'snapshot';
      host.dataset.effect = 'soft-glow';
      host.dataset.from = from; host.dataset.to = to;
      host.setAttribute('aria-hidden', 'true'); host.setAttribute('role', 'presentation');
      const shadow = host.attachShadow({ mode: 'closed' });
      const style = document.createElement('style');
      style.textContent = `${css}\n:host{pointer-events:none!important}body{pointer-events:none!important}body>.view-nav{visibility:hidden!important}*,*::before,*::after{pointer-events:none!important;animation:none!important;transition:none!important;caret-color:transparent!important}[data-snapshot-enabled]{opacity:1!important;-webkit-text-fill-color:currentColor!important}`;
      shadow.append(style, clone);
      glow = document.createElement('div');
      glow.className = 'page-transition-glow'; glow.dataset.pageTransition = 'glow';
      glow.dataset.effect = 'soft-glow'; glow.style.opacity = '0';
      glow.setAttribute('aria-hidden', 'true'); glow.setAttribute('role', 'presentation');
      // Matching z-index and insertion order put the halo above the old page,
      // with the original navigation at z5 above both visual-only layers.
      body.append(host, glow);
      active = { host, glow, from, to };
      host.dataset.nodeCount = String(nodes);
      const elapsed = Math.round((clock() - started) * 10) / 10;
      host.dataset.captureMs = String(elapsed); body.dataset.pageTransitionCaptureMs = String(elapsed);
      return active;
    } catch {
      host?.remove(); glow?.remove(); cleanup('capture-failed');
      return null;
    }
  }
  function reveal(ticket) {
    if (!ticket || ticket !== active) return false;
    try {
      if (!supported() || document.querySelector('dialog[open]')) { cleanup('unavailable'); return false; }
      const button = [...document.querySelectorAll('[data-view-target]')].find(node => node.dataset.viewTarget === ticket.to);
      const bounds = button?.getBoundingClientRect();
      if (!bounds?.width || !bounds.height) { cleanup('no-origin'); return false; }
      const width = window.innerWidth, height = window.innerHeight;
      const geometry = revealGeometry(bounds, width, height), host = ticket.host;
      const feather = Math.max(36, Math.min(72, SOFT_GLOW_FEATHER * Math.min(width, height) / 350));
      const maximumRadius = geometry.radius + feather / 2;
      const glowScale = feather / SOFT_GLOW_FEATHER;
      host.dataset.originX = String(geometry.x); host.dataset.originY = String(geometry.y);
      host.dataset.radius = String(maximumRadius); host.dataset.duration = String(duration);
      host.dataset.feather = String(feather);
      const paint = progress => {
        const sample = sampleSoftGlow(progress), radius = maximumRadius * sample.radiusProgress;
        const inner = Math.max(0, radius - feather / 2), outer = radius + feather / 2;
        const span = outer - inner, center = `${geometry.x}px ${geometry.y}px`;
        // Inverse of the approved new-page alpha mask: 1,.ee,.60,0.
        // At exactly zero, preserve the entire old page rather than a tiny hole.
        const mask = progress === 0 ? 'none' : `radial-gradient(circle ${outer}px at ${center}, transparent ${inner}px, rgba(0,0,0,0.066667) ${inner + span * .32}px, rgba(0,0,0,0.623529) ${inner + span * .72}px, #000 ${outer}px)`;
        host.style.webkitMaskImage = mask; host.style.maskImage = mask;
        const glowInner = Math.max(0, radius - 30 * glowScale), glowOuter = radius + 32 * glowScale;
        const glowSpan = glowOuter - glowInner;
        ticket.glow.style.backgroundImage = `radial-gradient(circle ${glowOuter}px at ${center}, rgba(217,241,255,0) ${glowInner}px, rgba(217,241,255,0.070588) ${glowInner + glowSpan * .4}px, rgba(242,251,255,0.192157) ${glowInner + glowSpan * .56}px, rgba(225,243,255,0.086275) ${glowInner + glowSpan * .76}px, rgba(217,241,255,0) ${glowOuter}px)`;
        ticket.glow.style.opacity = String(sample.glowOpacity);
        host.dataset.progress = String(progress);
        host.dataset.radiusProgress = String(sample.radiusProgress);
        host.dataset.glowOpacity = String(sample.glowOpacity);
        host.dataset.stage = sample.stage;
        host.dataset.elapsedMs = String(sample.elapsedMs);
      };
      paint(0); body.dataset.pageTransition = 'running';
      let start = null;
      const tick = timestamp => {
        if (active !== ticket) return;
        try {
          if (start === null) start = timestamp;
          const progress = Math.max(0, Math.min(1, (timestamp - start) / duration));
          paint(progress);
          if (progress === 1) cleanup('complete');
          else frame = window.requestAnimationFrame(tick);
        } catch { cleanup('animation-failed'); }
      };
      frame = window.requestAnimationFrame(tick);
      timeout = window.setTimeout(() => { if (active === ticket) cleanup('timeout'); }, duration + 180);
      return true;
    } catch { cleanup('animation-failed'); return false; }
  }
  const cancelForResize = () => cleanup('resize');
  const cancelForPagehide = () => cleanup('pagehide');
  const cancelForVisibility = () => { if (document.hidden) cleanup('hidden'); };
  const cancelForMotion = () => { if (motion.matches) cleanup('reduced-motion'); };
  window?.addEventListener?.('resize', cancelForResize);
  window?.addEventListener?.('orientationchange', cancelForResize);
  window?.visualViewport?.addEventListener?.('resize', cancelForResize);
  window?.addEventListener?.('pagehide', cancelForPagehide);
  document.addEventListener?.('visibilitychange', cancelForVisibility);
  if (motion?.addEventListener) motion.addEventListener('change', cancelForMotion);
  else motion?.addListener?.(cancelForMotion);
  if (window?.MutationObserver) {
    const dialogs = new window.MutationObserver(records => {
      if (records.some(record => record.target.tagName === 'DIALOG' && record.target.open)) cleanup('modal');
    });
    dialogs.observe(body, { subtree: true, attributes: true, attributeFilter: ['open'] });
  }
  return { prepare, reveal, cleanup };
}
