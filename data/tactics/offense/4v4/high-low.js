import {defineTactic, run, dribble, pass} from '../../helpers.js';

export default defineTactic({
  id: 'high-low', mode: '4v4', title: '高低位配合', category: '内线配合',
  description: '先经左翼把球送入高位，3 号低位反跑，高位再向篮下传球。',
  steps: [
    {
      note: '1 号先把球转到左翼 2 号。4 号上提高位接应，3 号从右侧低位向内调整，为高低位连线做准备。',
      positions: { 'attack-1': [500, 610], 'attack-2': [170, 420], 'attack-3': [760, 210], 'attack-4': [500, 330], 'defense-1': [500, 510], 'defense-2': [240, 350], 'defense-3': [680, 230], 'defense-4': [500, 265] },
      paths: [pass(1, [500, 610], [170, 420]), run(4, [500, 330], [500, 390]), run(3, [760, 210], [650, 220])]
    },
    {
      note: '2 号已在左翼接球，4 号在高位呈现接球目标。2 号观察高位窗口后传球，3 号暂时维持低位位置。',
      holder: 'attack-2', positions: { 'attack-4': [500, 390], 'attack-3': [650, 220], 'defense-1': [430, 500], 'defense-2': [240, 340], 'defense-3': [580, 225], 'defense-4': [510, 310] },
      paths: [pass(2, [170, 420], [500, 390])]
    },
    {
      note: '4 号已高位接球并面向篮筐。3 号沿底线绕过低位防守的身后，向右侧近筐区域反跑；球暂留高位。',
      holder: 'attack-4', positions: {},
      paths: [run(3, [650, 220], [660, 155], [580, 180])]
    },
    {
      note: '3 号已出现在低位接球窗口，4 号利用高位视野向内传球。两名外线队友继续保持传球出口。',
      positions: { 'attack-3': [580, 180], 'defense-3': [630, 235], 'defense-4': [490, 310] },
      paths: [pass(4, [500, 390], [580, 180])]
    },
    {
      note: '3 号接球后向篮筐方向运一步；4 号退出内传通道，准备接应防守收缩后的回传。',
      holder: 'attack-3', positions: { 'defense-3': [625, 245], 'defense-4': [535, 300] },
      paths: [dribble(3, [580, 180], [555, 155], [510, 190]), run(4, [500, 390], [430, 450])]
    },
    {
      note: '3 号近筐控球，根据防守决定终结或传出。4 号高位外撤，1 号与 2 号保持外线宽度。',
      positions: { 'attack-3': [510, 190], 'attack-4': [430, 450], 'defense-3': [565, 240], 'defense-4': [480, 365] }
    }
  ]
});
