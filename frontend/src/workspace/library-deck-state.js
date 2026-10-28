const MAX_SIZE = 16384;
function boundedNumber(value, maximum) {
  let number;
  try { number = Number(value); } catch { return 0; }
  return Number.isFinite(number) ? Math.max(0, Math.min(maximum, number)) : 0;
}

/** Pure measured geometry. All catalog titles share one page; short portrait
 * expansion uses an explicit overlay rather than clipping the other titles. */
export function layoutLibraryDeck(options = {}) {
  const input = options && typeof options === 'object' ? options : {};
  const width = boundedNumber(input.width, MAX_SIZE), height = boundedNumber(input.height, MAX_SIZE);
  const count = Math.floor(boundedNumber(input.count, 9));
  const selected = Number.isInteger(input.selected) && input.selected >= 0 && input.selected < count ? input.selected : -1;
  const empty = () => ({ strip: 0, gap: 0, wide: false, compact: true, layout: 'portrait', entries: Array.from({ length: count }, () => ({ x: 0, y: 0, width: 0, height: 0, header: 0, hidden: false })) });
  if (!count || !width || !height) return empty();
  const wide = width >= 580 && width / height >= 1.2;
  const overlay = !wide && selected >= 0 && count > 6 && height < 430;
  const gap = Math.min(selected >= 0 ? 4 : 6, height / Math.max(1, count * 8));
  const columns = Math.min(2, count), rows = Math.ceil(count / columns);
  let strip = wide
    ? Math.min(46, Math.max(0, (height - gap * (rows - 1)) / rows))
    : Math.min(46, Math.max(0, (height - gap * (count - 1)) / count));
  if (!wide && selected >= 0 && !overlay) strip = Math.min(40, Math.max(0, (height - gap * (count - 1) - Math.min(168, height * .65)) / count));
  if (overlay) strip = Math.min(40, height);
  const others = count - 1;
  const sideColumns = wide && selected >= 0 && others * 36 + Math.max(0, others - 1) * 5 > height ? 2 : 1;
  const sideRows = Math.ceil(others / sideColumns), sideGap = Math.min(5, height / Math.max(1, others * 8));
  const sideStrip = sideRows ? Math.min(46, Math.max(0, (height - (sideRows - 1) * sideGap) / sideRows)) : strip;
  const columnGap = Math.min(12, width / 8), leftWidth = others ? (width - columnGap) * .55 : width;
  const rightX = leftWidth + columnGap, rightWidth = Math.max(0, width - rightX);
  const sideColumnGap = Math.min(7, rightWidth / 8);
  let y = 0, rank = 0;
  const entries = Array.from({ length: count }, (_, index) => {
    const opened = index === selected;
    if (wide && selected >= 0) {
      if (opened) return { x: 0, y: 0, width: leftWidth, height, header: strip, hidden: false };
      const order = rank++, cardWidth = (rightWidth - (sideColumns - 1) * sideColumnGap) / sideColumns;
      return { x: rightX + order % sideColumns * (cardWidth + sideColumnGap), y: Math.floor(order / sideColumns) * (sideStrip + sideGap), width: cardWidth, height: sideStrip, header: sideStrip, hidden: false };
    }
    if (wide) {
      const cardWidth = (width - (columns - 1) * gap) / columns;
      return { x: index % columns * (cardWidth + gap), y: Math.floor(index / columns) * (strip + gap), width: cardWidth, height: strip, header: strip, hidden: false };
    }
    if (overlay) return { x: 0, y: 0, width, height: opened ? height : strip, header: strip, hidden: !opened };
    const cardHeight = opened ? height - (count - 1) * (strip + gap) : strip;
    const entry = { x: 0, y, width, height: cardHeight, header: strip, hidden: false };
    y += cardHeight + gap;
    return entry;
  });
  const bodyHeight = selected >= 0 ? entries[selected].height - entries[selected].header : 0;
  return { strip, gap, wide, compact: strip < 40 || width < 300 || (selected >= 0 ? bodyHeight < 220 : height < 360), layout: wide ? 'wide' : overlay ? 'overlay' : 'portrait', entries };
}
