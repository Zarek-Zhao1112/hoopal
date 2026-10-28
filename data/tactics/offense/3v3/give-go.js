import {defineTemplate, line} from '../../legacy-helpers.js';

export default defineTemplate('give-go', '传切配合', '1 号传球后切入，2 号观察并回传。', [
  { note: '1 号弧顶持球，2 号在左翼准备接球，3 号在右侧保持宽度。', positions: { 'attack-1': [500, 590], 'attack-2': [200, 390], 'attack-3': [810, 390] }, paths: [line('pass', 'attack-1', [[500, 590], [200, 390]])] },
  { note: '1 号传球给 2 号后，先向右做假动作，再从防守人身后切向篮下。', positions: { 'attack-1': [550, 485], 'defense-1': [510, 450] }, holder: 'attack-2', paths: [line('run', 'attack-1', [[550, 485], [620, 370], [520, 200]])] },
  { note: '2 号抓住切入窗口回传。若路线被封锁，保持球权重新组织。', positions: { 'attack-1': [520, 200], 'defense-1': [570, 290], 'defense-2': [265, 350] }, paths: [line('pass', 'attack-2', [[200, 390], [520, 200]])] },
  { note: '1 号接球终结，2 号与 3 号保持外线接应。', positions: {}, holder: 'attack-1' }
]);
