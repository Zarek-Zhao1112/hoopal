import {defineTemplate, line} from '../../legacy-helpers.js';

export default defineTemplate('four-out-cut', '四人传切', '四人拉开站位，传球、空切与弱侧补位同步进行。', [
  { note: '四人拉开：1 号弧顶持球，2 号左翼接应，3 号右翼，4 号右侧低位。', positions: { 'attack-1': [500, 590], 'attack-2': [190, 400], 'attack-3': [810, 450], 'attack-4': [750, 210], 'defense-1': [500, 515], 'defense-2': [245, 350], 'defense-3': [750, 400], 'defense-4': [685, 210] }, paths: [line('pass', 'attack-1', [[500, 590], [190, 400]])] },
  { note: '1 号传给 2 号后空切。3 号向弧顶补位，4 号保持底线空间。', positions: { 'attack-1': [470, 420], 'attack-3': [650, 560], 'defense-1': [490, 355], 'defense-3': [680, 480] }, holder: 'attack-2', paths: [line('run', 'attack-1', [[470, 420], [400, 290], [480, 190]]), line('run', 'attack-3', [[650, 560], [500, 590]])] },
  { note: '2 号观察空切窗口，向篮下回传；3 号补到弧顶，随时准备重新组织。', positions: { 'attack-1': [480, 190], 'attack-3': [500, 590], 'defense-1': [445, 270], 'defense-3': [560, 510] }, paths: [line('pass', 'attack-2', [[190, 400], [480, 190]])] },
  { note: '1 号接球近筐终结。若低位协防收缩，4 号是底线传球出口。', positions: { 'defense-4': [580, 205] }, holder: 'attack-1' }
], '4v4');
