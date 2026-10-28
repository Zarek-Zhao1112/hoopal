export const STORAGE_KEYS = Object.freeze({
  draft: 'halfcourt-draft-v1',
  library: 'halfcourt-library-v1'
});

const copy = value => JSON.parse(JSON.stringify(value));
const message = error => error instanceof Error ? error.message : String(error);

/**
 * Browser/native adapters only need async getItem(key) and setItem(key, string).
 * Saved arguments are snapshotted immediately; adapter operations run in order.
 */
export function createRepository({ adapter, validatePlay, maxLibrary = 40 } = {}) {
  if (!adapter || typeof adapter.getItem !== 'function' || typeof adapter.setItem !== 'function') throw new TypeError('存储适配器须提供 getItem 和 setItem');
  if (typeof validatePlay !== 'function') throw new TypeError('须提供战术校验函数');
  if (!Number.isInteger(maxLibrary) || maxLibrary < 1) throw new TypeError('战术库容量须为正整数');

  let queue = Promise.resolve();
  let lastWrite = Promise.resolve();
  let backupSequence = 0;
  const backedUpRaw = new Map();
  // A failed initial load leaves the editor's fallback state unfit for autosave.
  // Only an explicit successful load can establish the original state again.
  const failedLoads = new Map();
  const snapshotPlay = play => copy(validatePlay(copy(play)));

  function enqueue(operation) {
    const result = queue.then(operation);
    // A failed operation remains observable to its caller, but cannot poison later work.
    queue = result.catch(() => {});
    return result;
  }

  function decode(key, raw) {
    const isDraft = key === STORAGE_KEYS.draft;
    const empty = isDraft ? null : [];
    const label = isDraft ? '草稿' : '战术库';
    if (raw === null) return { value: empty, raw, damaged: false, warnings: [] };
    const warnings = [];
    try {
      if (typeof raw !== 'string') throw new Error('存储内容不是文本');
      const parsed = JSON.parse(raw);
      if (isDraft) return { value: snapshotPlay(parsed), raw, damaged: false, warnings };
      if (!Array.isArray(parsed)) throw new Error('战术库内容不是数组');
      const value = [];
      for (let index = 0; index < parsed.length; index++) {
        try {
          const play = snapshotPlay(parsed[index]);
          if (value.length < maxLibrary) value.push(play);
        } catch (error) {
          warnings.push(`战术库第 ${index + 1} 项损坏，已跳过：${message(error)}`);
        }
      }
      if (parsed.length > maxLibrary) warnings.push(`战术库超过 ${maxLibrary} 项，仅载入前 ${maxLibrary} 个有效战术`);
      const damaged = warnings.length > 0;
      if (damaged) warnings.push('战术库原始数据已保留，保存前将先备份');
      return { value, raw, damaged, warnings };
    } catch (error) {
      return { value: empty, raw, damaged: true, warnings: [`${label}损坏，已跳过；原始数据已保留，保存前将先备份：${message(error)}`] };
    }
  }

  async function read(key) {
    return decode(key, await adapter.getItem(key));
  }

  async function preserveCorrupt(key, record) {
    if (!record.damaged || backedUpRaw.get(key) === record.raw) return;
    // Do not replace a damaged original until this exact text has a durable backup.
    const suffix = globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${++backupSequence}-${Math.random().toString(36).slice(2)}`;
    try {
      await adapter.setItem(`${key}.corrupt-${suffix}`, record.raw);
    } catch (error) {
      throw new Error(`损坏数据备份失败，已停止保存并保留原文：${message(error)}`, { cause: error });
    }
    backedUpRaw.set(key, record.raw);
  }

  function save(key, valueFactory) {
    let serialized;
    try {
      // This runs before queueing: callers can safely keep editing their objects.
      serialized = JSON.stringify(valueFactory());
    } catch (error) {
      const rejected = Promise.reject(error);
      // flush() should observe a rejected save even when no adapter work was queued.
      rejected.catch(() => {});
      lastWrite = rejected;
      return rejected;
    }
    const result = enqueue(async () => {
      if (failedLoads.has(key)) {
        const cause = failedLoads.get(key);
        const label = key === STORAGE_KEYS.draft ? '草稿' : '战术库';
        throw new Error(`${label}读取曾失败，已暂停保存；请先重试读取以恢复原始数据：${message(cause)}`, { cause });
      }
      // Read failure stops the write; unknown original data must not be overwritten.
      const current = await read(key);
      await preserveCorrupt(key, current);
      await adapter.setItem(key, serialized);
    });
    lastWrite = result;
    return result;
  }

  return {
    load() {
      return enqueue(async () => {
        const result = { draft: null, library: [], warnings: [] };
        const reads = await Promise.allSettled([read(STORAGE_KEYS.draft), read(STORAGE_KEYS.library)]);
        for (let index = 0; index < reads.length; index++) {
          const field = index === 0 ? 'draft' : 'library';
          const key = STORAGE_KEYS[field];
          const record = reads[index];
          if (record.status === 'fulfilled') {
            failedLoads.delete(key);
            result[field] = record.value.value;
            result.warnings.push(...record.value.warnings);
          } else {
            failedLoads.set(key, record.reason);
            result.warnings.push(`${index === 0 ? '草稿' : '战术库'}读取失败，原始数据未更改；已暂停保存，请重试读取：${message(record.reason)}`);
          }
        }
        return result;
      });
    },
    saveDraft(play) { return save(STORAGE_KEYS.draft, () => snapshotPlay(play)); },
    saveLibrary(plays) {
      return save(STORAGE_KEYS.library, () => {
        if (!Array.isArray(plays)) throw new TypeError('战术库须为数组');
        if (plays.length > maxLibrary) throw new RangeError(`战术库最多保存 ${maxLibrary} 项`);
        return plays.map(snapshotPlay);
      });
    },
    flush() {
      const pending = queue;
      const latest = lastWrite;
      // A validation rejection may occur while earlier writes are still pending.
      return pending.then(() => latest);
    }
  };
}
