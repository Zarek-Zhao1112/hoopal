import {defineTactic, run, dribble, pass} from '../../helpers.js';

export default defineTactic({
  id: 'baseline-backdoor', title: '底线反跑', category: '空切配合',
  description: '2 号先上提试探，防守封外线时沿底线反跑接球。',
  steps: [
    {
      note: '1 号中路持球，2 号在左底角，3 号在右翼。2 号先向左翼上提，观察防守是否跟出。',
      positions: { 'attack-1': [520, 560], 'attack-2': [180, 190], 'attack-3': [820, 430], 'defense-1': [500, 480], 'defense-2': [250, 220], 'defense-3': [750, 385] },
      paths: [run(2, [180, 190], [180, 255], [200, 330])]
    },
    {
      note: '防守人封住外侧接球线，2 号变向反跑，从防守身后沿底线切入。1 号继续控制球，等待窗口。',
      positions: { 'attack-2': [200, 330], 'defense-2': [265, 325] },
      paths: [run(2, [200, 330], [145, 265], [230, 160], [360, 180])]
    },
    {
      note: '2 号已切到左侧近筐接球区，1 号观察回追与协防位置后传球，避免将球直接传进防守手中。',
      positions: { 'attack-2': [360, 180], 'defense-2': [230, 260], 'defense-1': [560, 385] },
      paths: [pass(1, [520, 560], [360, 180])]
    },
    {
      note: '2 号完成接球后再向篮筐方向运一步。3 号保持右翼接应，1 号不跟着球挤到篮下。',
      holder: 'attack-2', positions: { 'defense-2': [300, 230], 'defense-1': [520, 300] },
      paths: [dribble(2, [360, 180], [420, 170], [470, 190])]
    },
    {
      note: '2 号已到近筐区域，观察是否需要终结或回传；1 号与 3 号向外调整，提供清晰出口。',
      positions: { 'attack-2': [470, 190], 'defense-1': [435, 265] },
      paths: [run(1, [520, 560], [620, 500]), run(3, [820, 430], [810, 520])]
    },
    {
      note: '2 号近筐持球，外侧两名队友保持接应。防守补到位时应寻找回传，不把反跑等同于必然得分。',
      positions: { 'attack-1': [620, 500], 'attack-3': [810, 520], 'defense-1': [425, 265], 'defense-2': [355, 220] }
    }
  ]
});
