// 算数問題ジェネレーター(純粋モジュール・ブラウザ/Node共用)
// 問題 = { skillTag, text, answer, explanation }

function randInt(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function q(skillTag, text, answer, explanation) {
  return { skillTag, text, answer, explanation };
}

const GENERATORS = {
  // --- 低学年(1・2年) ---
  "add-basic": (rng) => {
    const a = randInt(rng, 1, 8);
    const b = randInt(rng, 1, 9 - a);
    return q(
      "add-basic",
      `${a} + ${b} = ?`,
      a + b,
      `${a}こ と ${b}こ を あわせると ${a + b}こ だよ`,
    );
  },
  "add-carry": (rng) => {
    const a = randInt(rng, 2, 9);
    const b = randInt(rng, Math.max(2, 11 - a), 9);
    return q(
      "add-carry",
      `${a} + ${b} = ?`,
      a + b,
      `${a}に ${10 - a}を たして 10。のこりの ${b - (10 - a)}を たすと ${a + b}!`,
    );
  },
  "sub-basic": (rng) => {
    const a = randInt(rng, 3, 9);
    const b = randInt(rng, 1, a - 1);
    return q(
      "sub-basic",
      `${a} - ${b} = ?`,
      a - b,
      `${a}から ${b}を とると ${a - b} だよ`,
    );
  },
  "sub-borrow": (rng) => {
    const b = randInt(rng, 2, 9);
    const a = 10 + randInt(rng, 0, b - 1);
    return q(
      "sub-borrow",
      `${a} - ${b} = ?`,
      a - b,
      `10から ${b}を ひいて ${10 - b}。のこりの ${a - 10}を たすと ${a - b}!`,
    );
  },
  kuku: (rng) => {
    const a = randInt(rng, 1, 9);
    const b = randInt(rng, 1, 9);
    return q(
      "kuku",
      `${a} × ${b} = ?`,
      a * b,
      `${a}のだんの 九九だよ。${a} × ${b} = ${a * b}`,
    );
  },
  // --- 中学年(3・4年) ---
  "add-3digit": (rng) => {
    const a = randInt(rng, 100, 899);
    const b = randInt(rng, 100, 999 - a);
    return q(
      "add-3digit",
      `${a} + ${b} = ?`,
      a + b,
      `一のくらいから じゅんに たそう。${a} + ${b} = ${a + b}`,
    );
  },
  "sub-3digit": (rng) => {
    const a = randInt(rng, 200, 999);
    const b = randInt(rng, 100, a - 1);
    return q(
      "sub-3digit",
      `${a} - ${b} = ?`,
      a - b,
      `一のくらいから じゅんに ひこう。${a} - ${b} = ${a - b}`,
    );
  },
  "mul-2x1": (rng) => {
    const a = randInt(rng, 12, 99);
    const b = randInt(rng, 2, 9);
    return q(
      "mul-2x1",
      `${a} × ${b} = ?`,
      a * b,
      `${Math.floor(a / 10) * 10} × ${b} = ${Math.floor(a / 10) * 10 * b}、` +
        `${a % 10} × ${b} = ${(a % 10) * b}。あわせて ${a * b}!`,
    );
  },
  "div-basic": (rng) => {
    const b = randInt(rng, 2, 9);
    const ans = randInt(rng, 2, 9);
    return q(
      "div-basic",
      `${b * ans} ÷ ${b} = ?`,
      ans,
      `${b}のだんで ${b * ans}に なるのは? ${b} × ${ans} = ${b * ans} だから こたえは ${ans}`,
    );
  },
  // --- 4年 ---
  "mul-2x2": (rng) => {
    const a = randInt(rng, 11, 99);
    const b = randInt(rng, 11, 99);
    return q(
      "mul-2x2",
      `${a} × ${b} = ?`,
      a * b,
      `ひっ算で といてみよう。${a} × ${b} = ${a * b}`,
    );
  },
  "big-add": (rng) => {
    const a = randInt(rng, 1000, 9999);
    const b = randInt(rng, 1000, 9999);
    return q(
      "big-add",
      `${a} + ${b} = ?`,
      a + b,
      `大きな数も 一のくらいから じゅんに たそう。こたえは ${a + b}`,
    );
  },
};

// 学年別カリキュラム(日本の算数)。1年に九九・わり算・かけ算は入れない。
// ※あまりのあるわり算は答えが「◯あまり△」の2値でキーパッド入力に合わないため第2弾へ。
export const GRADE_SKILLS = {
  1: ["add-basic", "add-carry", "sub-basic", "sub-borrow"],
  2: ["kuku", "add-carry", "sub-borrow", "add-3digit", "sub-3digit"],
  3: ["div-basic", "mul-2x1", "add-3digit", "sub-3digit"],
  4: ["div-basic", "mul-2x1", "mul-2x2", "big-add"],
};

export function generateQuestion(skillTag, rng = Math.random) {
  const gen = GENERATORS[skillTag];
  if (!gen) throw new Error(`unknown skill: ${skillTag}`);
  return gen(rng);
}

export function generateSession(grade, count = 10, rng = Math.random) {
  const skills = GRADE_SKILLS[grade];
  if (!skills) throw new Error(`unknown grade: ${grade}`);
  return Array.from({ length: count }, () =>
    generateQuestion(skills[Math.floor(rng() * skills.length)], rng),
  );
}
