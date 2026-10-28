const MODES = new Set(['3v3', '4v4']);
const TEAMS = new Set(['attack', 'defense']);
const PATH_TYPES = new Set(['run', 'pass', 'screen', 'dribble']);
const LIMITS = { frames: 60, paths: 80, points: 200, totalPoints: 20000, history: 100 };
const clone = value => JSON.parse(JSON.stringify(value));
const uid = () => globalThis.crypto?.randomUUID?.() ?? `play-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const text = (value, max, fallback = '') => typeof value === 'string' ? value.slice(0, max) : fallback;
const fail = message => { throw new Error(`战术文件无效：${message}`); };
const modeOf = mode => MODES.has(mode) ? mode : fail('仅支持 3v3 或 4v4');
const point = value => {
  if (!value || typeof value.x !== 'number' || typeof value.y !== 'number' || !Number.isFinite(value.x) || !Number.isFinite(value.y)) fail('坐标必须是有限数字');
  if (value.x < 70 || value.x > 930 || value.y < 70 || value.y > 730) fail('坐标超出球场');
  return { x: value.x, y: value.y };
};

export function createBoard(mode = '3v3') {
  modeOf(mode);
  const spots = [[500, 570], [190, 390], [810, 390], [500, 260]];
  const count = mode === '3v3' ? 3 : 4;
  const players = [];
  for (const team of ['attack', 'defense']) {
    for (let i = 0; i < count; i++) {
      const [x, y] = spots[i];
      players.push({ id: `${team}-${i + 1}`, team, number: i + 1, x: team === 'attack' ? x : x + (x < 500 ? 36 : x > 500 ? -36 : 0), y: team === 'attack' ? y : y - 62 });
    }
  }
  return { mode, players, ball: { x: 524, y: 554, holderId: 'attack-1' }, paths: [], note: '' };
}

export function createPlay(mode = '3v3') {
  return { id: uid(), title: '未命名战术', mode: modeOf(mode), frames: [createBoard(mode)], frameIndex: 0 };
}

/** Validate an imported document and copy only supported fields. Never retain importer references. */
export function validatePlay(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('需要战术对象');
  const mode = modeOf(value.mode);
  const count = mode === '3v3' ? 3 : 4;
  if (!Array.isArray(value.frames) || value.frames.length < 1 || value.frames.length > LIMITS.frames) fail(`步骤数量须为 1–${LIMITS.frames}`);
  let totalPoints = 0;
  let roster = null;
  const frames = value.frames.map(board => {
    if (!board || board.mode !== mode || !Array.isArray(board.players) || board.players.length !== count * 2) fail('球员数量或比赛模式不一致');
    const ids = new Set();
    const numbers = new Set();
    const teamCounts = { attack: 0, defense: 0 };
    const players = board.players.map(player => {
      if (!player || !TEAMS.has(player.team)) fail('球员队伍无效');
      const id = text(player.id, 80);
      if (!id || id !== player.id || ids.has(id)) fail('球员编号重复或无效');
      if (!Number.isInteger(player.number) || player.number < 1 || player.number > count || numbers.has(`${player.team}-${player.number}`)) fail('球衣号码重复或无效');
      ids.add(id);
      numbers.add(`${player.team}-${player.number}`);
      teamCounts[player.team]++;
      return { id, team: player.team, number: player.number, ...point(player) };
    });
    if (teamCounts.attack !== count || teamCounts.defense !== count) fail('两队球员数量不一致');
    const signature = players.map(p => `${p.id}:${p.team}:${p.number}`).sort().join('|');
    if (roster !== null && roster !== signature) fail('各步骤必须使用相同球员');
    roster = signature;
    const ballPosition = point(board.ball);
    const holderId = board.ball.holderId == null ? '' : board.ball.holderId;
    if (typeof holderId !== 'string' || (holderId && !ids.has(holderId))) fail('持球队员不存在');
    if (!Array.isArray(board.paths) || board.paths.length > LIMITS.paths) fail(`每步最多 ${LIMITS.paths} 条路线`);
    const pathIds = new Set();
    const paths = board.paths.map(path => {
      if (!path || !PATH_TYPES.has(path.type)) fail('路线类型无效');
      const id = text(path.id, 100);
      if (!id || pathIds.has(id)) fail('路线编号重复或无效');
      pathIds.add(id);
      if (!Array.isArray(path.points) || path.points.length < 2 || path.points.length > LIMITS.points) fail(`每条路线须有 2–${LIMITS.points} 个点`);
      totalPoints += path.points.length;
      if (totalPoints > LIMITS.totalPoints) fail('路线数据过大');
      const result = { id, type: path.type, points: path.points.map(point) };
      if (path.playerId) {
        if (!ids.has(path.playerId)) fail('路线关联球员不存在');
        result.playerId = path.playerId;
      }
      return result;
    });
    return { mode, players, ball: { ...ballPosition, holderId }, paths, note: text(board.note, 2000) };
  });
  const frameIndex = Number.isInteger(value.frameIndex) ? value.frameIndex : 0;
  return { id: text(value.id, 100) || uid(), title: text(value.title, 120, '未命名战术').trim() || '未命名战术', mode, frames, frameIndex: Math.max(0, Math.min(frames.length - 1, frameIndex)) };
}

export class PlayStore {
  #play;
  #past = [];
  #future = [];

  constructor(play = createPlay()) { this.#play = validatePlay(play); }
  get play() { return this.#play; }
  get board() { return this.#play.frames[this.#play.frameIndex]; }
  get canUndo() { return this.#past.length > 0; }
  get canRedo() { return this.#future.length > 0; }

  #commit(next) {
    const valid = validatePlay(next);
    if (JSON.stringify(valid) === JSON.stringify(this.#play)) return false;
    this.#past.push(clone(this.#play));
    if (this.#past.length > LIMITS.history) this.#past.shift();
    this.#future = [];
    this.#play = valid;
    return true;
  }
  update(mutator) {
    const next = clone(this.#play);
    mutator(next.frames[next.frameIndex]);
    return this.#commit(next);
  }
  changeFrame(index) {
    if (!Number.isInteger(index) || index < 0 || index >= this.#play.frames.length) return false;
    this.#play.frameIndex = index;
    return true;
  }
  addFrame() {
    if (this.#play.frames.length >= LIMITS.frames) throw new Error(`最多支持 ${LIMITS.frames} 个步骤`);
    const next = clone(this.#play);
    const board = clone(next.frames[next.frameIndex]);
    board.paths = [];
    board.note = '';
    next.frames.splice(next.frameIndex + 1, 0, board);
    next.frameIndex++;
    this.#commit(next);
  }
  deleteFrame() {
    if (this.#play.frames.length === 1) return false;
    const next = clone(this.#play);
    next.frames.splice(next.frameIndex, 1);
    next.frameIndex = Math.min(next.frameIndex, next.frames.length - 1);
    return this.#commit(next);
  }
  undo() {
    if (!this.canUndo) return false;
    this.#future.push(clone(this.#play));
    this.#play = this.#past.pop();
    return true;
  }
  redo() {
    if (!this.canRedo) return false;
    this.#past.push(clone(this.#play));
    this.#play = this.#future.pop();
    return true;
  }
  load(play) {
    const valid = validatePlay(play);
    this.#play = valid;
    this.#past = [];
    this.#future = [];
  }
  reset(mode = this.#play.mode) { this.#commit(createPlay(mode)); }
  setTitle(title) {
    const next = clone(this.#play);
    next.title = title;
    return this.#commit(next);
  }
}

export function ballPosition(board) {
  const holder = board.players.find(player => player.id === board.ball.holderId);
  return holder ? { x: Math.min(930, holder.x + 24), y: Math.max(70, holder.y - 16) } : board.ball;
}

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const blendPoint = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

/** Follow a matching annotation at constant distance per unit time, without mutating it. */
function routePosition(paths, predicate, start, end, tolerance, t) {
  const route = paths.find(path => predicate(path) && path.points.length >= 2 && distance(path.points[0], start) < tolerance && distance(path.points.at(-1), end) < tolerance);
  if (!route) return blendPoint(start, end, t);
  const points = [start, ...route.points.slice(1, -1), end];
  const lengths = points.slice(1).map((p, i) => distance(points[i], p));
  const total = lengths.reduce((sum, length) => sum + length, 0);
  if (total === 0) return { x: start.x, y: start.y };
  let remaining = total * t;
  for (let i = 0; i < lengths.length; i++) {
    if (lengths[i] === 0) continue;
    if (remaining <= lengths[i]) return blendPoint(points[i], points[i + 1], remaining / lengths[i]);
    remaining -= lengths[i];
  }
  return { x: end.x, y: end.y };
}

/** Interpolate one frame transition. Rendering must use the returned free ball position. */
export function interpolateBoards(from, to, t) {
  t = Number.isFinite(t) ? Math.max(0, Math.min(1, t)) : 0;
  if (t === 0) return clone(from);
  if (t === 1) return clone(to);
  const startBall = ballPosition(from);
  const endBall = ballPosition(to);
  const players = from.players.map(player => {
    const target = to.players.find(p => p.id === player.id) ?? player;
    const position = routePosition(from.paths, path => (path.type === 'run' || path.type === 'dribble') && path.playerId === player.id, player, target, 45, t);
    return { ...player, ...position };
  });
  const retainsBall = from.ball.holderId && from.ball.holderId === to.ball.holderId;
  const position = retainsBall
    ? ballPosition({ players, ball: from.ball })
    : routePosition(from.paths, path => path.type === 'pass', startBall, endBall, 60, t);
  return {
    ...clone(from),
    players,
    ball: { x: position.x, y: position.y, holderId: '' }
  };
}

