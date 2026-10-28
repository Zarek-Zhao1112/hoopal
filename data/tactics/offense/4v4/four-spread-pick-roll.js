import {defineTactic, run, dribble, screen, pass} from '../../helpers.js';

export default defineTactic({
  id: 'four-spread-pick-roll', mode: '4v4', title: '挡拆弱侧拉开', category: '挡拆配合',
  description: '4 号高位掩护后顺下，两侧底角拉开，1 号突破后寻找内传。',
  steps: [
    {
      note: '1 号弧顶持球，4 号从右侧上提。2 号左底角与 3 号右底角保持宽度，不提前切进挡拆区域。',
      positions: { 'attack-1': [500, 600], 'attack-2': [180, 190], 'attack-3': [820, 190], 'attack-4': [720, 370], 'defense-1': [500, 520], 'defense-2': [250, 220], 'defense-3': [750, 220], 'defense-4': [660, 330] },
      paths: [run(4, [720, 370], [635, 425], [565, 510])]
    },
    {
      note: '4 号站稳高位掩护，1 号借挡向右运球。弱侧 2 号保持底角站位，使其防守人需要兼顾外线。',
      positions: { 'attack-4': [565, 510], 'defense-4': [590, 430] },
      paths: [screen(4, [565, 510], [520, 510]), dribble(1, [500, 600], [620, 550], [680, 465], [680, 380])]
    },
    {
      note: '1 号进入右侧突破区后继续控球，4 号结束掩护转身顺下。两名底角队友保持接应。',
      positions: { 'attack-1': [680, 380], 'defense-1': [605, 470], 'defense-4': [590, 330] },
      paths: [run(4, [565, 510], [540, 350], [500, 220])]
    },
    {
      note: '4 号顺下到近筐区域，1 号观察内传窗口后传球；若弱侧协防收缩，也可以选择底角接应。',
      positions: { 'attack-4': [500, 220], 'defense-1': [720, 430], 'defense-4': [600, 200], 'defense-3': [740, 240] },
      paths: [pass(1, [680, 380], [500, 220])]
    },
    {
      note: '4 号已接球，1 号向右外侧退出原突破通道；2 号和 3 号保留两侧出球点。',
      holder: 'attack-4', positions: { 'defense-4': [560, 150], 'defense-1': [700, 380] },
      paths: [run(1, [680, 380], [760, 500])]
    },
    {
      note: '4 号在近筐位置阅读补防，决定终结或转移。外线保持空间，避免所有人同时冲向持球点。',
      positions: { 'attack-1': [760, 500], 'defense-1': [700, 420] }
    }
  ]
});
