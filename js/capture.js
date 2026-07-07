// 出現モンスターの抽選。レア度ごとの重みで1体選ぶ

const RARITY_WEIGHT = { N: 70, R: 25, SR: 5 };

export function pickEncounter(monsters, rng = Math.random) {
  // 各個体の重み = そのレア度の重み / 同レア度の頭数 → レア度合計が N70:R25:SR5 になる
  const byRarity = {};
  for (const m of monsters) byRarity[m.rarity] = (byRarity[m.rarity] || 0) + 1;
  const weights = monsters.map(
    (m) => RARITY_WEIGHT[m.rarity] / byRarity[m.rarity],
  );
  const total = weights.reduce((s, w) => s + w, 0);
  let r = rng() * total;
  for (let i = 0; i < monsters.length; i++) {
    r -= weights[i];
    if (r < 0) return monsters[i];
  }
  return monsters[monsters.length - 1];
}
