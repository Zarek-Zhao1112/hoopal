// Capacitor-independent adapters. Dependencies are injected so the browser and
// native contracts can be tested without a running WebView.
export const FILE_NOT_FOUND = 'OS-PLUG-FILE-0008';
export const isMissingFile = error => error?.code === FILE_NOT_FOUND;

export function storagePath(key) {
  if (typeof key !== 'string' || !key.length || key.length > 200) {
    throw new TypeError('存储键必须是 1–200 字符的字符串');
  }
  return `halfcourt/storage/${encodeURIComponent(key)}.txt`;
}

export function safeFilename(filename) {
  if (typeof filename !== 'string') throw new TypeError('导出文件名无效');
  const cleaned = filename.replace(/[\\/:*?"<>|\u0000-\u001f\u007f]/g, '_').replace(/^\.+/, '').trim();
  if (!cleaned) throw new TypeError('导出文件名无效');
  // Android filesystems commonly cap a single path component at 255 bytes.
  // Leave room below that limit and retain the file type after long CJK/emoji
  // play titles. Code-point iteration never splits a UTF-16 surrogate pair.
  const extension = cleaned.match(/\.[a-z0-9]{1,16}$/i)?.[0] || '';
  const basename = extension ? cleaned.slice(0, -extension.length) : cleaned;
  const encoder = new TextEncoder();
  let budget = 200 - encoder.encode(extension).length;
  let shortened = '';
  for (const character of basename) {
    const bytes = encoder.encode(character).length;
    if (bytes > budget) break;
    shortened += character;
    budget -= bytes;
  }
  return shortened + extension;
}

export function bytesToBase64(bytes) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const parts = [];
  let part = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b = bytes[i + 1], c = bytes[i + 2];
    const n = (bytes[i] << 16) | ((b ?? 0) << 8) | (c ?? 0);
    part += alphabet[(n >>> 18) & 63] + alphabet[(n >>> 12) & 63]
      + (b === undefined ? '=' : alphabet[(n >>> 6) & 63])
      + (c === undefined ? '=' : alphabet[n & 63]);
    if (part.length >= 8192) { parts.push(part); part = ''; }
  }
  parts.push(part);
  return parts.join('');
}

const uid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function createPlatformAdapters({
  isNative = () => false,
  filesystem,
  preferences,
  share,
  app,
  directory = { Data: 'DATA', Cache: 'CACHE' },
  encoding = { UTF8: 'utf8' },
  getLocalStorage = () => globalThis.localStorage,
  getDocument = () => globalThis.document,
  url = () => globalThis.URL,
  schedule = (callback, delay) => globalThis.setTimeout(callback, delay),
  onError = (error, context) => {
    console.error(`[HALFCOURT ${context}]`, error);
    if (typeof globalThis.dispatchEvent === 'function' && typeof globalThis.CustomEvent === 'function') {
      globalThis.dispatchEvent(new CustomEvent('halfcourt:platform-error', { detail: { error, context } }));
    }
  },
} = {}) {
  // Reporting itself must not create unhandled promise rejections inside native
  // event callbacks. Consumers can show the custom event as a toast.
  function report(error, context) {
    try {
      const result = onError(error, context);
      if (result?.catch) result.catch(reportError => console.error(reportError));
    } catch (reportError) { console.error(reportError); }
  }

  function createStorageAdapter() {
    if (!isNative()) {
      return {
        async getItem(key) { return getLocalStorage().getItem(key); },
        async setItem(key, value) { getLocalStorage().setItem(key, String(value)); },
        async flush() {},
      };
    }
    const pending = new Map();
    function enqueue(key, operation) {
      const prior = pending.get(key) || Promise.resolve();
      const next = prior.catch(() => {}).then(operation);
      pending.set(key, next);
      // Attach a rejection handler immediately while retaining the original
      // rejected promise for the caller and flush().
      next.catch(() => {});
      return next;
    }
    async function write(key, value) {
      const path = storagePath(key), temporary = `${path}.${uid()}.tmp`;
      await filesystem.writeFile({ path: temporary, directory: directory.Data, data: value, encoding: encoding.UTF8, recursive: true });
      try {
        // Never delete the old destination first: the final rename replaces it.
        await filesystem.rename({ from: temporary, to: path, directory: directory.Data, toDirectory: directory.Data });
      } catch (error) {
        try { await filesystem.deleteFile({ path: temporary, directory: directory.Data }); }
        catch (cleanupError) { if (!isMissingFile(cleanupError)) report(cleanupError, '清理临时存储文件'); }
        throw error;
      }
    }
    return {
      getItem(key) {
        return enqueue(key, async () => {
          const path = storagePath(key);
          try { await filesystem.stat({ path, directory: directory.Data }); }
          catch (error) {
            if (!isMissingFile(error)) throw error;
            const migrationKey = `halfcourt-migrated:${key}`;
            const marker = await preferences.get({ key: migrationKey });
            if (marker.value === '1') return null;
            // Only migrate the current WebView origin, and leave its original
            // value intact. Permission/IO errors never trigger migration.
            const legacy = getLocalStorage().getItem(key);
            if (legacy !== null) await write(key, legacy);
            await preferences.set({ key: migrationKey, value: '1' });
            return legacy;
          }
          const result = await filesystem.readFile({ path, directory: directory.Data, encoding: encoding.UTF8 });
          if (typeof result.data !== 'string') throw new TypeError('原生存储返回了无效文本');
          return result.data;
        });
      },
      setItem(key, value) { return enqueue(key, () => write(key, String(value))); },
      async flush() { await Promise.all([...pending.values()]); },
    };
  }

  function createSettingsAdapter() {
    if (!isNative()) return createStorageAdapter();
    return {
      async getItem(key) { return (await preferences.get({ key })).value; },
      async setItem(key, value) { await preferences.set({ key, value: String(value) }); },
    };
  }

  async function exportFile(blob, filename) {
    const name = safeFilename(filename);
    if (!blob || typeof blob.arrayBuffer !== 'function' || typeof blob.text !== 'function') throw new TypeError('导出内容不是文件');
    if (!isNative()) {
      const document = getDocument(), urls = url();
      const objectUrl = urls.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = name;
      link.style.display = 'none';
      try { document.body.append(link); link.click(); }
      finally {
        link.remove();
        // Some mobile browsers consume the URL after the click returns.
        schedule(() => urls.revokeObjectURL(objectUrl), 60000);
      }
      return { method: 'download' };
    }
    const path = `exports/${uid()}/${name}`;
    const textFile = /^text\//i.test(blob.type) || /(?:json|\+json)(?:;|$)/i.test(blob.type) || /\.json$/i.test(name);
    const options = { path, directory: directory.Cache, recursive: true };
    if (textFile) {
      options.data = await blob.text();
      options.encoding = encoding.UTF8;
    } else {
      options.data = bytesToBase64(new Uint8Array(await blob.arrayBuffer()));
    }
    const written = await filesystem.writeFile(options);
    const uri = written.uri || (await filesystem.getUri({ path, directory: directory.Cache })).uri;
    try {
      await share.share({ title: name, dialogTitle: '导出战术', files: [uri] });
    } catch (error) {
      // Capacitor Share 8 Android/iOS rejects with this exact message and no
      // stable code when the chooser is dismissed. Keep other failures intact.
      if (error?.message === 'Share canceled' || error?.name === 'AbortError') {
        throw Object.assign(new Error('已取消导出', { cause: error }), { code: 'USER_CANCELLED' });
      }
      throw error;
    }
    // Cache must remain available for the receiving app to read asynchronously.
    return { method: 'share' };
  }

  async function setupLifecycle({ onBackground = async () => {}, onBack = async () => false } = {}) {
    if (!isNative()) return async () => {};
    let disposed = false;
    let backPending = false;
    const handles = [];
    const safeListener = (callback, context) => (...args) => {
      if (disposed) return Promise.resolve();
      return Promise.resolve().then(() => callback(...args)).catch(error => report(error, context));
    };
    const background = safeListener(async ({ isActive }) => {
      if (!isActive) await onBackground();
    }, '后台保存失败');
    const back = safeListener(async event => {
      if (backPending) return;
      backPending = true;
      try {
        if (await onBack(event) === true) return;
        await onBackground();
        await app.minimizeApp();
      } finally { backPending = false; }
    }, '返回操作失败');
    async function cleanup() {
      disposed = true;
      const outcomes = await Promise.allSettled(handles.map(handle => handle.remove()));
      const failed = outcomes.find(result => result.status === 'rejected');
      if (failed) throw failed.reason;
    }
    try {
      handles.push(await app.addListener('appStateChange', background));
      handles.push(await app.addListener('backButton', back));
    } catch (error) {
      try { await cleanup(); } catch (cleanupError) { report(cleanupError, '释放原生监听'); }
      throw error;
    }
    return cleanup;
  }
  // User-authorized retirement of the old personal library. The main keys are
  // emptied by the builtin repository; remove only their own residual copies.
  async function cleanupLegacyExtras() {
    const failures = [];
    let webRemoved = 0, nativeRemoved = 0;
    const backupKey = /^halfcourt-(?:draft|library)-v1\.corrupt-[a-zA-Z0-9-]+$/;
    const residualFile = /^halfcourt-(?:draft|library)-v1(?:\.corrupt-[a-zA-Z0-9-]+\.txt(?:\.[a-zA-Z0-9-]+\.tmp)?|\.txt\.[a-zA-Z0-9-]+\.tmp)$/;
    try {
      const legacy = getLocalStorage();
      const keys = Array.from({length:legacy.length}, (_, index) => legacy.key(index)).filter(key => typeof key === 'string' && backupKey.test(key));
      for (const key of keys) {
        try { legacy.removeItem(key); webRemoved++; }
        catch (error) { failures.push(error); }
      }
    } catch (error) { failures.push(error); }
    if (isNative()) {
      let entries = [];
      try { entries = (await filesystem.readdir({path:'halfcourt/storage',directory:directory.Data})).files; }
      catch (error) { if (!isMissingFile(error)) failures.push(error); }
      for (const entry of entries) {
        // Anchored basename matching excludes separators, unrelated keys and
        // export/cache directories. Never recursively delete a directory.
        if (typeof entry.name !== 'string' || !residualFile.test(entry.name) || entry.type === 'directory') continue;
        try {
          await filesystem.deleteFile({path:`halfcourt/storage/${entry.name}`,directory:directory.Data});
          nativeRemoved++;
        } catch (error) { if (!isMissingFile(error)) failures.push(error); }
      }
    }
    if (failures.length) throw new AggregateError(failures, '部分旧个人数据副本清除失败，下次启动重试');
    return {webRemoved,nativeRemoved};
  }
  return { createStorageAdapter, createSettingsAdapter, exportFile, setupLifecycle, cleanupLegacyExtras };
}
