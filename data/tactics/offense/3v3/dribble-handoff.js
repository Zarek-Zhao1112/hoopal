import {defineTactic, run, dribble, screen, pass} from '../../helpers.js';

export default defineTactic({
  id: 'dribble-handoff', title: '手递手配合', category: '手递手',
  description: '2 号近身接手递手，借 1 号掩护突破，再寻找外弹回传。',
  steps: [
    {
      note: '1 号中路持球，2 号从右翼靠近，3 号留在左底角。两人先缩短交球距离，不远距离冒充手递手。',
      positions: { 'attack-1': [500, 530], 'attack-2': [800, 400], 'attack-3': [160, 190], 'defense-1': [500, 455], 'defense-2': [730, 350], 'defense-3': [235, 220] },
      paths: [dribble(1, [500, 530], [560, 500]), run(2, [800, 400], [710, 480], [620, 510])]
    },
    {
      note: '1 号与 2 号近身相遇，1 号停稳后将球交给 2 号。先完成这次短距交接，再开始借挡突破。',
      positions: { 'attack-1': [560, 500], 'attack-2': [620, 510], 'defense-1': [505, 440], 'defense-2': [605, 435] },
      paths: [pass(1, [560, 500], [620, 510])]
    },
    {
      note: '2 号已接到手递手；1 号保持静止形成掩护，2 号绕过其身侧向左突破。3 号继续拉开底线空间。',
      holder: 'attack-2', positions: {},
      paths: [screen(1, [560, 500], [580, 465]), dribble(2, [620, 510], [620, 570], [520, 570], [490, 460], [430, 370])]
    },
    {
      note: '2 号突破吸引内侧协防，1 号掩护结束后向右外弹。这里先形成接应站位，球仍由 2 号控制。',
      positions: { 'attack-2': [430, 370], 'defense-1': [470, 295], 'defense-2': [530, 445] },
      paths: [run(1, [560, 500], [635, 545], [700, 540])]
    },
    {
      note: '1 号已外弹到右侧，2 号观察回传通道后将球传出。左底角 3 号提供另一接应方向。',
      positions: { 'attack-1': [700, 540], 'defense-1': [485, 300], 'defense-2': [485, 430] },
      paths: [pass(2, [430, 370], [700, 540])]
    },
    {
      note: '1 号外侧接球，获得接投或重新组织的选择。若防守已回位，应继续传导，不强行出手。',
      holder: 'attack-1', positions: { 'defense-1': [535, 340] }
    }
  ]
});
