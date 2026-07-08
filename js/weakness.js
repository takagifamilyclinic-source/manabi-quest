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

// 苦手トップN(正答率の低い順)。実績があるスキルのみ対象。親ページ表示用。
export function weaknessTop(attempts, profileId, n = 5) {
  const mine = attempts.filter((a) => a.profileId === profileId);
  const by = {};
  for (const a of mine) {
    by[a.skillTag] ??= { skillTag: a.skillTag, tries: 0, ok: 0 };
    by[a.skillTag].tries++;
    if (a.correct) by[a.skillTag].ok++;
  }
  return Object.values(by)
    .map((v) => ({
      skillTag: v.skillTag,
      rate: v.ok / v.tries,
      tries: v.tries,
    }))
    .sort((x, y) => x.rate - y.rate)
    .slice(0, n);
}
