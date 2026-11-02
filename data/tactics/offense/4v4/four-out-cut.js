import {withBodyTypes} from '../../body-types-helper.js';
import {defineRoles} from '../../role-helpers.js';
import {defineTemplate, line} from '../../legacy-helpers.js';

export default withBodyTypes(defineTemplate('four-out-cut', '四人传切', '四人拉开站位，传球、空切与弱侧补位同步进行。', [
  { note: '四人拉开：1 号弧顶持球，2 号左翼接应，3 号右翼，4 号右侧低位。', positions: { 'attack-1': [500, 590], 'attack-2': [190, 400], 'attack-3': [810, 450], 'attack-4': [750, 210], 'defense-1': [500, 515], 'defense-2': [245, 350], 'defense-3': [750, 400], 'defense-4': [685, 210] }, paths: [line('pass', 'attack-1', [[500, 590], [190, 400]])] },
  { note: '1 号传给 2 号后空切。3 号向弧顶补位，4 号保持底线空间。', positions: { 'attack-1': [470, 420], 'attack-3': [650, 560], 'defense-1': [490, 355], 'defense-3': [680, 480] }, holder: 'attack-2', paths: [line('run', 'attack-1', [[470, 420], [400, 290], [480, 190]]), line('run', 'attack-3', [[650, 560], [500, 590]])] },
  { note: '2 号观察空切窗口，向篮下回传；3 号补到弧顶，随时准备重新组织。', positions: { 'attack-1': [480, 190], 'attack-3': [500, 590], 'defense-1': [445, 270], 'defense-3': [560, 510] }, paths: [line('pass', 'attack-2', [[190, 400], [480, 190]])] },
  { note: '1 号接球近筐终结。若低位协防收缩，4 号是底线传球出口。', positions: { 'defense-4': [580, 205] }, holder: 'attack-1' }
], '4v4', defineRoles('offense', [
  ["传切终结者","传球给翼侧2号后切入篮下，接回传完成近筐终结。",["pass-cut","cut-finish"]],
  ["翼侧回传者","接球保护球权，观察1号空切窗口并将球回传篮下。",["read-cut-pass"]],
  ["外线上提者","随1号切入上提到弧顶，填补外线空位并准备重新组织。",["fill-perimeter","space-outlet"]],
  ["底线接应者","留在底线出口拉开空间，防守收缩时准备接球或转移。",["space-outlet"]],
])), {
  "one-big": "传球后切入，其他队员补位并留出回传空间。",
  "two-big": "先拉开外线间距，再衔接切入、回传与补位。",
  "similar": "四人保持传切间距，空切后及时补上外线。"
});
