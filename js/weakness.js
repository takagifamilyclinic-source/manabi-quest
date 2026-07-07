// 苦手スキルほど大きい重みを返す(純粋)。直近RECENT件の正答率を使う。
const RECENT = 40;
const WEAK = 2;

export function weightBySkill(skills, attempts, profileId, opts = {}) {
  const recent = opts.recent ?? RECENT;
  const weak = opts.weak ?? WEAK;
  const mine = attempts.filter((a) => a.profileId === profileId);
  return skills.map((skill) => {
    const rows = mine.filter((a) => a.skillTag === skill).slice(-recent);
    if (rows.length === 0) return 1;
    const p = rows.filter((a) => a.correct).length / rows.length;
    return 1 + weak * (1 - p);
  });
}
