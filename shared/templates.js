import { templateDefinitions } from '../data/templates.js';
import { createPlay, createBoard, ballPosition, validatePlay } from './engine.js';

const clone = value => JSON.parse(JSON.stringify(value));

function makeTemplate(id, title, description, steps, mode = '3v3', category = '基础配合', difficulty = '基础', kind = 'offense') {
  return {
    id, title, description, mode, category, difficulty, kind,
    build() {
      const play = createPlay(mode);
      play.title = title;
      let board = createBoard(mode);
      play.frames = steps.map((step, i) => {
        board = clone(board);
        board.paths = [];
        board.note = step.note;
        for (const [pid, xy] of Object.entries(step.positions)) {
          const p = board.players.find(p => p.id === pid);
          [p.x, p.y] = xy;
        }
        board.ball.holderId = step.holder ?? board.ball.holderId;
        Object.assign(board.ball, ballPosition(board));
        board.paths = (step.paths ?? []).map((path, j) => ({ ...path, id: `${id}-${i}-${j}` }));
        return board;
      });
      return validatePlay(play);
    }
  };
}

export const templates = templateDefinitions.map(({ id, title, description, steps, mode, category, difficulty, kind }) =>
  makeTemplate(id, title, description, steps, mode, category, difficulty, kind)
);
