// Role numbers follow the existing animation, not jersey numbers or nominal positions.
const role = (task, weights, essential = [], moving = false) => ({ task, weights, essential, moving });
export const offenseRules = [
  { templateId: 'pick-roll', complexity: 2, roles: [
    role('持球借2号掩护突破，观察顺下并传球', { handling: 4, driving: 3, passing: 4 }, ['handling', 'passing'], true),
    role('站稳掩护后顺下，接球在篮下终结', { screening: 4, finishing: 4 }, ['screening', 'finishing'], true),
    role('弱侧拉开，保留外线接应与投射威胁', { shooting: 3, passing: 1 }) ] },
  { templateId: 'give-go', complexity: 0, roles: [
    role('传球后切入篮下，接回传完成近筐终结', { passing: 2, finishing: 4 }, ['finishing'], true),
    role('翼侧接球组织，观察切入时机回传', { passing: 5, handling: 1 }, ['passing']),
    role('弱侧拉开并随球调整接应', { shooting: 2, passing: 1 }) ] },
  { templateId: 'back-screen', complexity: 2, roles: [
    role('持球观察背掩护与切入窗口，输送传球', { passing: 5, handling: 2 }, ['passing']),
    role('借3号背掩护空切，接球近筐终结', { finishing: 5 }, ['finishing'], true),
    role('站稳背掩护后外弹，准备外线接投', { screening: 4, shooting: 3 }, ['screening'], true) ] },
  { templateId: 'four-out-cut', complexity: 0, roles: [
    role('传球后切入篮下，接回传终结', { passing: 2, finishing: 4 }, ['finishing'], true),
    role('翼侧接球后观察并回传给切入者', { passing: 5, handling: 1 }, ['passing']),
    role('随切入上提补位，维持外线接应', { passing: 2, shooting: 2 }, [], true),
    role('留在底线出口，提供拉开与接应', { shooting: 2, passing: 1 }) ] },
  { templateId: 'dribble-handoff', complexity: 3, roles: [
    role('近身交球后站稳掩护，再外弹接2号回传投射', { passing: 3, screening: 4, shooting: 5 }, ['screening', 'shooting'], true),
    role('接手递手后持球突破，吸引协防并回传给1号', { handling: 5, driving: 5, passing: 4 }, ['handling', 'driving', 'passing'], true),
    role('底角拉开，准备接球投射与转移', { shooting: 3, passing: 1 }) ] },
  { templateId: 'pick-pop', complexity: 3, roles: [
    role('持球借挡突破，观察外弹者并回传', { handling: 4, driving: 4, passing: 4 }, ['handling', 'passing'], true),
    role('站稳掩护后外弹到外线，接球投射', { screening: 4, shooting: 6 }, ['screening', 'shooting'], true),
    role('底角拉开，牵制弱侧并接应', { shooting: 3, passing: 1 }) ] },
  { templateId: 'baseline-backdoor', complexity: 1, roles: [
    role('持球观察底线反跑，传球给切入者', { passing: 5, handling: 1 }, ['passing']),
    role('先做接球假动作再沿底线反跑，近筐接球终结', { finishing: 5, driving: 1 }, ['finishing'], true),
    role('右翼接应，保持回传出口和空间', { passing: 2, shooting: 2 }) ] },
  { templateId: 'four-spread-pick-roll', complexity: 2, roles: [
    role('持球借4号掩护突破，读协防并传给顺下者', { handling: 4, driving: 4, passing: 4 }, ['handling', 'passing'], true),
    role('左底角拉开，准备接球投射', { shooting: 4, passing: 1 }),
    role('右底角拉开，准备接球投射', { shooting: 4, passing: 1 }),
    role('高位站稳掩护后顺下，接球篮下终结', { screening: 5, finishing: 5 }, ['screening', 'finishing'], true) ] },
  { templateId: 'staggered-screens', complexity: 4, roles: [
    role('观察连续掩护，给借挡的2号输送传球', { passing: 5, handling: 2 }, ['passing']),
    role('依次借两道掩护接球，可接投或继续传给顺下的4号', { shooting: 5, passing: 5, handling: 1 }, ['shooting', 'passing'], true),
    role('站稳第一道掩护，再拉开接应', { screening: 4, shooting: 2 }, ['screening'], true),
    role('站稳第二道掩护，再顺下接球终结', { screening: 4, finishing: 4 }, ['screening', 'finishing'], true) ] },
  { templateId: 'high-low', complexity: 2, roles: [
    role('初始持球转移到翼侧，随后平衡站位', { passing: 3, handling: 1 }),
    role('翼侧接球，向高位4号送入口传球', { passing: 4, handling: 1 }, ['passing']),
    role('低位先要位再反跑，接高位传球近筐终结', { finishing: 6 }, ['finishing'], true),
    role('高位接球策应，观察低位3号并送出内传', { passing: 7, handling: 1 }, ['passing']) ] },
  { templateId: 'drive-corner-kick', complexity: 2, roles: [
    role('初始转移球给3号，留在外线平衡与接应', { passing: 3, shooting: 1 }),
    role('弱侧保持空间，准备继续转移与接投', { shooting: 3, passing: 1 }),
    role('接球持球突破，吸引协防后分给4号底角', { handling: 5, driving: 5, passing: 5 }, ['handling', 'driving', 'passing'], true),
    role('底角保留空间，接3号分球投射', { shooting: 7 }, ['shooting']) ] },
  { templateId: 'spain-pick-roll', complexity: 4, roles: [
    role('持球借4号掩护突破，观察顺下与外弹出口', { handling: 4, driving: 4, passing: 5 }, ['handling', 'passing'], true),
    role('为顺下者的防守人设背掩护，随后外弹接投', { screening: 4, shooting: 6 }, ['screening', 'shooting'], true),
    role('弱侧底角拉开，保留传球出口', { shooting: 4, passing: 1 }),
    role('给持球人设主掩护后顺下，接球近筐终结', { screening: 5, finishing: 5 }, ['screening', 'finishing'], true) ] },
  { templateId: 'post-split', complexity: 3, roles: [
    role('先传给低位3号，再向中路站稳为2号设无球掩护，结束后退出接应', { passing: 4, screening: 5 }, ['passing', 'screening'], true),
    role('等1号停稳后借无球掩护切入，接低位回传近筐终结', { finishing: 6 }, ['finishing'], true),
    role('低位接球保护球权，观察2号切入并回传，随后补到侧翼接应', { passing: 7, handling: 3 }, ['passing', 'handling'], true) ] },
  { templateId: 'slip-screen', complexity: 2, roles: [
    role('弧顶控球，观察2号提前拆出后的窗口，送出内传并调整外线接应', { handling: 4, passing: 6 }, ['handling', 'passing'], true),
    role('靠近挡点但尚未建立接触便提前顺下，接球后近筐终结', { finishing: 6, handling: 2 }, ['finishing'], true),
    role('弱侧保持空间，保留外线接投与回传出口', { shooting: 3, passing: 1 }) ] },
  { templateId: 'offball-flare', complexity: 3, roles: [
    role('左翼持球，等2号借无球掩护向外跑出，再向右翼输送传球', { passing: 7, handling: 2 }, ['passing']),
    role('借3号站稳的无球掩护，远离持球侧向外弹，接球判断投射', { shooting: 7 }, ['shooting'], true),
    role('为2号站稳无球掩护，释放后避开传球通道并补中路接应', { screening: 6, passing: 1 }, ['screening'], true) ] },
  { templateId: 'hammer', complexity: 4, roles: [
    role('右翼沿底线突破保留球权，观察弱侧掩护后跨底线传给2号', { handling: 5, driving: 5, passing: 7 }, ['handling', 'driving', 'passing'], true),
    role('等3号在弱侧站稳，借掩护沉到底角，接跨侧分球判断接投', { shooting: 7 }, ['shooting'], true),
    role('在弱侧为2号站稳掩护，待其落到底角后再退出接应', { screening: 6, passing: 1 }, ['screening'], true),
    role('弧顶拉开并保留传球出口，不挤入底线突破通道', { shooting: 3, passing: 2 }) ] },
  { templateId: 'zoom-handoff', complexity: 4, roles: [
    role('高位持球等2号借挡上提，近身手递手交球后继续停稳掩护，再外撤', { passing: 4, handling: 3, screening: 5 }, ['passing', 'screening'], true),
    role('先借3号下掩护上提，再接1号近身手递手，借挡突破后分给底角4号', { handling: 6, driving: 6, passing: 5 }, ['handling', 'driving', 'passing'], true),
    role('先站稳为2号设下掩护，完成后再退出到外线拉开接应', { screening: 6, shooting: 2, passing: 1 }, ['screening'], true),
    role('右底角保持接应，最后接2号突破分球并判断接投', { shooting: 7, passing: 1 }, ['shooting']) ] },
  { templateId: 'screen-the-screener', complexity: 4, roles: [
    role('弧顶先观察3号空切，等待2号借第二道掩护绕出后输送传球', { passing: 7, handling: 2 }, ['passing']),
    role('先站稳掩护3号切入，再借4号掩护绕到右翼，接球判断投射', { screening: 5, shooting: 7 }, ['screening', 'shooting'], true),
    role('借2号第一道无球掩护切入近筐，保持终结威胁与内线接应', { finishing: 5 }, ['finishing'], true),
    role('为刚掩护过人的2号站稳设挡，待其绕出后再向内侧接应', { screening: 6, finishing: 2, passing: 1 }, ['screening'], true) ] }
];
