// 漢字の出題ビルダ(純粋)。読み・書きを同一元データから生成。
import { KANJI_G1 } from "../data/kanji/g1.js";
import { KANJI_G2 } from "../data/kanji/g2.js";
import { KANJI_G3 } from "../data/kanji/g3.js";
import { KANJI_G4 } from "../data/kanji/g4.js";

export const KANJI_BY_GRADE = {
  1: KANJI_G1,
  2: KANJI_G2,
  3: KANJI_G3,
  4: KANJI_G4,
};

export function kanjiSkills(grade) {
  return [`kanji-read-g${grade}`, `kanji-write-g${grade}`];
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

function sampleUnique(rng, arr, n, exclude) {
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

function shuffle(rng, arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function makeKanjiQuestion(skillTag, rng = Math.random) {
  const m = skillTag.match(/^kanji-(read|write)-g(\d)$/);
  if (!m) throw new Error(`unknown kanji skill: ${skillTag}`);
  const kind = m[1];
  const grade = Number(m[2]);
  const list = KANJI_BY_GRADE[grade];
  if (!list) throw new Error(`unknown grade: ${grade}`);
  const target = pick(rng, list);

  if (kind === "read") {
    const answer = target.yomi[0];
    const otherYomi = [];
    for (const k of list)
      if (k.kanji !== target.kanji) otherYomi.push(...k.yomi);
    const dummies = sampleUnique(
      rng,
      otherYomi,
      3,
      new Set([answer, ...target.yomi]),
    );
    const choices = shuffle(rng, [answer, ...dummies]);
    return {
      subject: "kanji",
      skillTag,
      text: `「${target.kanji}」の よみは どれ?`,
      choices,
      answer,
      explanation: `${target.kanji} = ${target.meaning}`,
    };
  }

  const answer = target.kanji;
  const others = list
    .filter((k) => k.kanji !== target.kanji)
    .map((k) => k.kanji);
  const dummies = sampleUnique(rng, others, 3, new Set([answer]));
  const choices = shuffle(rng, [answer, ...dummies]);
  return {
    subject: "kanji",
    skillTag,
    text: `「${target.yomi[0]}」の かんじは どれ?`,
    choices,
    answer,
    explanation: `${target.kanji} = ${target.meaning}`,
  };
}
