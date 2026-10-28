export const BUILTIN_SELECTION_KEY = 'halfcourt-builtin-selection-v1';
export const LEGACY_KEYS = Object.freeze({ draft: 'halfcourt-draft-v1', library: 'halfcourt-library-v1' });

const message = error => error instanceof Error ? error.message : String(error);

/** Only the builtin source and original step are persistent; edits stay in memory. */
export function createBuiltinRepository({
  adapter,
  templates,
  getLegacyStorage = () => globalThis.localStorage,
  clearLegacyExtras = async () => {},
} = {}) {
  if (!adapter || typeof adapter.getItem !== 'function' || typeof adapter.setItem !== 'function') throw new TypeError('须提供异步存储适配器');
  if (!Array.isArray(templates) || !templates.length) throw new TypeError('须提供内置战术目录');
  const frameCounts = new Map();
  for (const template of templates) {
    if (typeof template.id !== 'string' || !template.id || frameCounts.has(template.id) || typeof template.build !== 'function') throw new TypeError('内置战术标识须唯一且可构建');
    const count = template.build().frames.length;
    if (!Number.isInteger(count) || count < 1) throw new TypeError('内置战术须至少有一步');
    frameCounts.set(template.id, count);
  }
  const defaultId = templates[0].id;
  let queue = Promise.resolve(), lastWrite = Promise.resolve(), selectionReadFailed = false;

  function enqueue(operation) {
    const result = queue.then(operation);
    queue = result.catch(() => {});
    return result;
  }
  function normalize(value, strict = false) {
    const validId = typeof value?.templateId === 'string' && frameCounts.has(value.templateId);
    if (!validId && strict) throw new TypeError('只能记住现有内置战术');
    const templateId = validId ? value.templateId : defaultId;
    const index = validId && Number.isInteger(value.frameIndex) ? value.frameIndex : 0;
    return { templateId, frameIndex: Math.max(0, Math.min(frameCounts.get(templateId) - 1, index)) };
  }
  async function clearLegacy(warnings) {
    let cleared = true;
    // Deletion is authorized. Never read, back up, validate or migrate old Plays.
    for (const [key, empty] of [[LEGACY_KEYS.draft, 'null'], [LEGACY_KEYS.library, '[]']]) {
      try { await adapter.setItem(key, empty); }
      catch (error) { cleared = false; warnings.push(`旧${key === LEGACY_KEYS.draft ? '草稿' : '个人战术库'}清除失败，下次启动将重试：${message(error)}`); }
    }
    try {
      const legacy = getLegacyStorage();
      if (!legacy || typeof legacy.setItem !== 'function') throw new Error('WebView 旧存储不可用');
      for (const [key, empty] of [[LEGACY_KEYS.draft, 'null'], [LEGACY_KEYS.library, '[]']]) {
        try { await legacy.setItem(key, empty); }
        catch (error) { cleared = false; warnings.push(`WebView 旧数据清除失败，下次启动将重试：${message(error)}`); }
      }
    } catch (error) { cleared = false; warnings.push(`WebView 旧数据清除失败，下次启动将重试：${message(error)}`); }
    try { await clearLegacyExtras(); }
    catch (error) { cleared = false; warnings.push(`旧数据副本清除失败，下次启动将重试：${message(error)}`); }
    return cleared;
  }

  return {
    load() {
      return enqueue(async () => {
        const warnings = [];
        const legacyCleared = await clearLegacy(warnings);
        let selection = normalize(null);
        try {
          const raw = await adapter.getItem(BUILTIN_SELECTION_KEY);
          selectionReadFailed = false;
          if (raw !== null) {
            try {
              const decoded = JSON.parse(raw);
              selection = normalize(decoded);
              if (decoded?.templateId !== selection.templateId || decoded?.frameIndex !== selection.frameIndex) warnings.push('内置战术进度无效，已恢复到可用步骤');
            } catch { warnings.push('内置战术进度损坏，已恢复默认示例'); }
          }
        } catch (error) {
          selectionReadFailed = true;
          warnings.push(`内置战术进度读取失败，请重启重试：${message(error)}`);
        }
        return { selection, warnings, legacyCleared };
      });
    },
    saveSelection(value) {
      let serialized;
      try { serialized = JSON.stringify(normalize(value, true)); }
      catch (error) {
        const rejected = Promise.reject(error);
        rejected.catch(() => {});
        lastWrite = rejected;
        return rejected;
      }
      const result = enqueue(async () => {
        if (selectionReadFailed) throw new Error('内置进度读取曾失败，请重新加载后再记录');
        await adapter.setItem(BUILTIN_SELECTION_KEY, serialized);
      });
      lastWrite = result;
      return result;
    },
    flush() { const pending = queue, latest = lastWrite; return pending.then(() => latest); }
  };
}
