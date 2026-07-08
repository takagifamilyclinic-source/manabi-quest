// やる気の仕組みの純粋計算(レベル・獲得XP/ポイント・捕獲/進化)。副作用なし。
const EVOLVE_AT = 3;

// 累積XP: レベルLに到達するのに必要な総XP = 100*(L-1)*L/2
function cumXp(level) {
  return (100 * (level - 1) * level) / 2;
}

export function levelFromXp(xp) {
  let level = 1;
  while (cumXp(level + 1) <= xp) level++;
  return { level, inLevel: xp - cumXp(level), need: level * 100 };
}

export function sessionGain(battle) {
  const c = battle.correctCount;
  return { xp: c * 10 + 50, points: c * 1 + 5 };
}

export function addCapture(captures, id) {
  return { ...captures, [id]: (captures[id] || 0) + 1 };
}

export function isEvolved(captures, id, threshold = EVOLVE_AT) {
  return (captures[id] || 0) >= threshold;
}

export function ownedCount(captures) {
  return Object.keys(captures).length;
}
