import {defineTemplate, line} from '../../legacy-helpers.js';

export default defineTemplate('back-screen', '无球背掩护', '3 号为 2 号背掩护，2 号空切，3 号外弹。', [
  { note: '1 号弧顶观察，2 号左翼，3 号从右侧向禁区上沿移动。', positions: { 'attack-1': [500, 590], 'attack-2': [220, 370], 'attack-3': [770, 370], 'defense-2': [275, 325] }, paths: [line('run', 'attack-3', [[770, 370], [320, 290]])] },
  { note: '3 号站稳为 2 号做背掩护，2 号先向外试探，再切向篮下。', positions: { 'attack-3': [320, 290] }, paths: [line('screen', 'attack-3', [[320, 290], [280, 310]]), line('run', 'attack-2', [[220, 370], [240, 240], [480, 180]])] },
  { note: '1 号传给空切的 2 号；3 号掩护后向右侧外弹，给防守第二个选择。', positions: { 'attack-2': [480, 180], 'attack-3': [740, 460], 'defense-2': [320, 270], 'defense-3': [550, 320] }, paths: [line('pass', 'attack-1', [[500, 590], [480, 180]])] },
  { note: '2 号接球近筐终结。防守换人时可将球转移到外弹的 3 号。', positions: {}, holder: 'attack-2' }
]);
