import {defineTactic, run, dribble, pass} from '../../helpers.js';

export default defineTactic({
  id: 'drive-corner-kick', mode: '4v4', title: '突破分底角', category: '突破分球',
  description: '球转右翼后突破牵制，底角小幅移动拉开，再接分球。',
  steps: [
    {
      note: '1 号弧顶向右翼 3 号转移球，传球后向左保持平衡。2 号在左底角，4 号在右底角拉开。',
      positions: { 'attack-1': [500, 590], 'attack-2': [170, 180], 'attack-3': [820, 430], 'attack-4': [820, 190], 'defense-1': [500, 510], 'defense-2': [245, 215], 'defense-3': [750, 390], 'defense-4': [750, 230] },
      paths: [pass(1, [500, 590], [820, 430]), run(1, [500, 590], [420, 590])]
    },
    {
      note: '3 号右翼接球后向中路突破，先迫使底角防守人做选择。4 号此时留在底角，避免主动把协防带进来。',
      holder: 'attack-3', positions: { 'attack-1': [420, 590], 'defense-1': [455, 520], 'defense-3': [750, 355] },
      paths: [dribble(3, [820, 430], [750, 380], [675, 330], [640, 260])]
    },
    {
      note: '底角防守人向突破点收缩，3 号继续控球阅读。4 号沿底线小幅外移，使分球角度更清晰。',
      positions: { 'attack-3': [640, 260], 'defense-3': [715, 325], 'defense-4': [575, 230] },
      paths: [run(4, [820, 190], [850, 170])]
    },
    {
      note: '4 号已在右底角外移接应，3 号将球分向底角。弱侧 2 号和弧顶 1 号保持宽度，准备继续传导。',
      positions: { 'attack-4': [850, 170], 'defense-4': [590, 230], 'defense-3': [690, 320] },
      paths: [pass(3, [640, 260], [850, 170])]
    },
    {
      note: '4 号已接到底角分球，可观察接投或沿底线突破。3 号离开原突破点，保持出球后的空间。',
      holder: 'attack-4', positions: { 'defense-4': [640, 190] },
      paths: [run(3, [640, 260], [560, 350])]
    },
    {
      note: '4 号面对回扑做判断，1 号、2 号与 3 号均可接应。防守已经回位时，应重新组织而非勉强完成动作。',
      positions: { 'attack-3': [560, 350], 'defense-3': [620, 300], 'defense-4': [760, 210] }
    }
  ]
});
