// Original four templates retain their IDs, order, steps and positions.
function defineTemplate(id, title, description, steps, mode = '3v3') {
  return { id, title, description, steps, mode };
}

const line = (type, playerId, points) => ({ type, playerId, points: points.map(([x, y]) => ({ x, y })) });

export const templateDefinitions = [
  defineTemplate('pick-roll', '高位挡拆', '2 号高位掩护，1 号借掩护突破，2 号顺下。', [
    { note: '起始站位：1 号弧顶持球，2 号左侧准备上提，3 号右侧拉开空间。', positions: { 'attack-1': [500, 590], 'attack-2': [220, 350], 'attack-3': [810, 430], 'defense-1': [500, 515], 'defense-2': [270, 310], 'defense-3': [760, 380] }, paths: [line('run', 'attack-2', [[220, 350], [430, 510]])] },
    { note: '2 号在持球防守人左侧建立静止掩护；1 号等掩护站稳后向左侧运球。', positions: { 'attack-2': [430, 510], 'defense-2': [400, 430] }, paths: [line('screen', 'attack-2', [[430, 510], [477, 510]]), line('dribble', 'attack-1', [[500, 590], [360, 470], [330, 350]])] },
    { note: '1 号突破吸引协防，2 号转身顺下；3 号保持右侧站位提供传球出口。', positions: { 'attack-1': [330, 350], 'attack-2': [450, 290], 'defense-1': [395, 390], 'defense-2': [400, 285] }, paths: [line('run', 'attack-2', [[450, 290], [500, 185]]), line('pass', 'attack-1', [[330, 350], [500, 185]])] },
    { note: '2 号接球近筐终结。若防守收缩，观察右侧 3 号的空位机会。', positions: { 'attack-2': [500, 185], 'defense-2': [460, 225] }, holder: 'attack-2' }
  ]),
  defineTemplate('give-go', '传切配合', '1 号传球后切入，2 号观察并回传。', [
    { note: '1 号弧顶持球，2 号在左翼准备接球，3 号在右侧保持宽度。', positions: { 'attack-1': [500, 590], 'attack-2': [200, 390], 'attack-3': [810, 390] }, paths: [line('pass', 'attack-1', [[500, 590], [200, 390]])] },
    { note: '1 号传球给 2 号后，先向右做假动作，再从防守人身后切向篮下。', positions: { 'attack-1': [550, 485], 'defense-1': [510, 450] }, holder: 'attack-2', paths: [line('run', 'attack-1', [[550, 485], [620, 370], [520, 200]])] },
    { note: '2 号抓住切入窗口回传。若路线被封锁，保持球权重新组织。', positions: { 'attack-1': [520, 200], 'defense-1': [570, 290], 'defense-2': [265, 350] }, paths: [line('pass', 'attack-2', [[200, 390], [520, 200]])] },
    { note: '1 号接球终结，2 号与 3 号保持外线接应。', positions: {}, holder: 'attack-1' }
  ]),
  defineTemplate('back-screen', '无球背掩护', '3 号为 2 号背掩护，2 号空切，3 号外弹。', [
    { note: '1 号弧顶观察，2 号左翼，3 号从右侧向禁区上沿移动。', positions: { 'attack-1': [500, 590], 'attack-2': [220, 370], 'attack-3': [770, 370], 'defense-2': [275, 325] }, paths: [line('run', 'attack-3', [[770, 370], [320, 290]])] },
    { note: '3 号站稳为 2 号做背掩护，2 号先向外试探，再切向篮下。', positions: { 'attack-3': [320, 290] }, paths: [line('screen', 'attack-3', [[320, 290], [280, 310]]), line('run', 'attack-2', [[220, 370], [240, 240], [480, 180]])] },
    { note: '1 号传给空切的 2 号；3 号掩护后向右侧外弹，给防守第二个选择。', positions: { 'attack-2': [480, 180], 'attack-3': [740, 460], 'defense-2': [320, 270], 'defense-3': [550, 320] }, paths: [line('pass', 'attack-1', [[500, 590], [480, 180]])] },
    { note: '2 号接球近筐终结。防守换人时可将球转移到外弹的 3 号。', positions: {}, holder: 'attack-2' }
  ]),
  defineTemplate('four-out-cut', '四人传切', '四人拉开站位，传球、空切与弱侧补位同步进行。', [
    { note: '四人拉开：1 号弧顶持球，2 号左翼接应，3 号右翼，4 号右侧低位。', positions: { 'attack-1': [500, 590], 'attack-2': [190, 400], 'attack-3': [810, 450], 'attack-4': [750, 210], 'defense-1': [500, 515], 'defense-2': [245, 350], 'defense-3': [750, 400], 'defense-4': [685, 210] }, paths: [line('pass', 'attack-1', [[500, 590], [190, 400]])] },
    { note: '1 号传给 2 号后空切。3 号向弧顶补位，4 号保持底线空间。', positions: { 'attack-1': [470, 420], 'attack-3': [650, 560], 'defense-1': [490, 355], 'defense-3': [680, 480] }, holder: 'attack-2', paths: [line('run', 'attack-1', [[470, 420], [400, 290], [480, 190]]), line('run', 'attack-3', [[650, 560], [500, 590]])] },
    { note: '2 号观察空切窗口，向篮下回传；3 号补到弧顶，随时准备重新组织。', positions: { 'attack-1': [480, 190], 'attack-3': [500, 590], 'defense-1': [445, 270], 'defense-3': [560, 510] }, paths: [line('pass', 'attack-2', [[190, 400], [480, 190]])] },
    { note: '1 号接球近筐终结。若低位协防收缩，4 号是底线传球出口。', positions: { 'defense-4': [580, 205] }, holder: 'attack-1' }
  ], '4v4')
];
