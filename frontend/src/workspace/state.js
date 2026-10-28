function positiveInteger(value, name) {
  if (!Number.isInteger(value) || value < 1) throw new TypeError(`${name}须为正整数`);
  return value;
}

/** Page numbers are zero-based. Empty collections still expose one empty page. */
export function paginate(items, page = 0, pageSize = 4) {
  if (!Array.isArray(items)) throw new TypeError('分页内容须为数组');
  positiveInteger(pageSize, '每页数量');
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.max(0, Math.min(pages - 1, Number.isFinite(page) ? Math.floor(page) : 0));
  const start = current * pageSize;
  return { items: items.slice(start, start + pageSize), page: current, pages, total: items.length, start, end: Math.min(start + pageSize, items.length) };
}

export function pageForIndex(index, pageSize = 6) {
  positiveInteger(pageSize, '每页数量');
  return Math.floor(Math.max(0, Number.isFinite(index) ? index : 0) / pageSize);
}

/** Preserve every character; prefer sentence boundaries without splitting surrogates. */
export function splitNote(text, maxChars = 160) {
  positiveInteger(maxChars, '讲解每页字数');
  const characters = Array.from(typeof text === 'string' ? text : String(text ?? ''));
  if (!characters.length) return [''];
  const pages = [];
  for (let start = 0; start < characters.length;) {
    let end = Math.min(start + maxChars, characters.length);
    if (end < characters.length) {
      const earliest = start + Math.max(1, Math.floor(maxChars * 0.55));
      for (let boundary = end; boundary >= earliest; boundary--) {
        if (/[。！？!?；;\n\s]/u.test(characters[boundary - 1])) { end = boundary; break; }
      }
    }
    pages.push(characters.slice(start, end).join(''));
    start = end;
  }
  return pages;
}
