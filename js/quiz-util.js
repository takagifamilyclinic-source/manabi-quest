// 4択ビルダ共通ヘルパ(純粋)。kanji-quiz / english-quiz(以後の教科も)で共用。
export function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

export function sampleUnique(rng, arr, n, exclude) {
  const pool = arr.filter((x) => !exclude.has(x));
  const out = [];
  const used = new Set();
  let guard = 0;
  while (out.length < n && guard++ < 1000 && pool.length) {
    const c = pick(rng, pool);
    if (!used.has(c)) {
      used.add(c);
      out.push(c);
    }
  }
  return out;
}

export function shuffle(rng, arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
