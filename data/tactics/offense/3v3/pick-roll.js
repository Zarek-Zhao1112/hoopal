import {defineTemplate, line} from '../../legacy-helpers.js';

export default defineTemplate('pick-roll', '高位挡拆', '2 号高位掩护，1 号借掩护突破，2 号顺下。', [
  { note: '起始站位：1 号弧顶持球，2 号左侧准备上提，3 号右侧拉开空间。', positions: { 'attack-1': [500, 590], 'attack-2': [220, 350], 'attack-3': [810, 430], 'defense-1': [500, 515], 'defense-2': [270, 310], 'defense-3': [760, 380] }, paths: [line('run', 'attack-2', [[220, 350], [430, 510]])] },
  { note: '2 号在持球防守人左侧建立静止掩护；1 号等掩护站稳后向左侧运球。', positions: { 'attack-2': [430, 510], 'defense-2': [400, 430] }, paths: [line('screen', 'attack-2', [[430, 510], [477, 510]]), line('dribble', 'attack-1', [[500, 590], [360, 470], [330, 350]])] },
  { note: '1 号突破吸引协防，2 号转身顺下；3 号保持右侧站位提供传球出口。', positions: { 'attack-1': [330, 350], 'attack-2': [450, 290], 'defense-1': [395, 390], 'defense-2': [400, 285] }, paths: [line('run', 'attack-2', [[450, 290], [500, 185]]), line('pass', 'attack-1', [[330, 350], [500, 185]])] },
  { note: '2 号接球近筐终结。若防守收缩，观察右侧 3 号的空位机会。', positions: { 'attack-2': [500, 185], 'defense-2': [460, 225] }, holder: 'attack-2' }
]);
