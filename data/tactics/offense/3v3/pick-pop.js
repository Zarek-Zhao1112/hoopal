import {defineTactic, run, dribble, screen, pass} from '../../helpers.js';

export default defineTactic({
  id: 'pick-pop', title: '挡拆外弹', category: '挡拆配合',
  description: '2 号高位掩护后向外弹开，1 号突破牵制后回传。',
  steps: [
    {
      note: '1 号弧顶持球，2 号从左翼上提准备掩护，3 号留在右底角拉开空间。',
      positions: { 'attack-1': [500, 590], 'attack-2': [230, 360], 'attack-3': [820, 190], 'defense-1': [500, 510], 'defense-2': [295, 325], 'defense-3': [750, 220] },
      paths: [run(2, [230, 360], [350, 445], [430, 510])]
    },
    {
      note: '2 号站稳高位掩护，1 号向左借挡运球。2 号先保持掩护位置，暂不提前外弹。',
      positions: { 'attack-2': [430, 510], 'defense-2': [395, 425] },
      paths: [screen(2, [430, 510], [475, 510]), dribble(1, [500, 590], [430, 590], [350, 540], [330, 390])]
    },
    {
      note: '1 号已进入左侧突破区，牵制两名防守人；2 号此时向右外弹，而非顺下。3 号不挤入禁区。',
      positions: { 'attack-1': [330, 390], 'defense-1': [405, 465], 'defense-2': [390, 315] },
      paths: [run(2, [430, 510], [490, 565], [650, 590])]
    },
    {
      note: '2 号外弹到弧顶右侧，1 号观察防守后回传。持球交接发生在这一段传球中。',
      positions: { 'attack-2': [650, 590], 'defense-1': [365, 320], 'defense-2': [430, 350] },
      paths: [pass(1, [330, 390], [650, 590])]
    },
    {
      note: '2 号已接球，可评估接投。1 号向左侧移开，避免在原突破点停留影响后续空间。',
      holder: 'attack-2', positions: { 'defense-2': [470, 400] },
      paths: [run(1, [330, 390], [235, 330], [210, 260])]
    },
    {
      note: '2 号持球面对回扑防守，1 号与 3 号分居两侧。根据防守选择投篮、突破或再传球。',
      positions: { 'attack-1': [210, 260], 'defense-1': [275, 305], 'defense-2': [585, 545] }
    }
  ]
});
