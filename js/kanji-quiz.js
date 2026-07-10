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

// 部首の同族ファミリー(氵と水 等)。部首問題のダミーから正解の同族を除外して
// 紛らわしい4択(泳の部首に氵と水が同時に並ぶ等)を防ぐ。
const RADICAL_FAMILIES = [
  ["氵", "水"],
  ["亻", "人"],
  ["扌", "手"],
  ["刂", "刀"],
  ["忄", "心"],
  ["灬", "火"],
  ["犭", "犬"],
  ["ネ", "示"],
  ["衤", "衣"],
  ["艹", "艸"],
  ["辶", "辵"],
  ["攵", "攴"],
  ["飠", "食"],
  ["王", "玉"],
  ["ツ", "⺍"],
];
const FAMILY_OF = new Map();
for (const fam of RADICAL_FAMILIES)
  for (const r of fam) FAMILY_OF.set(r, fam[0]);

export function radicalFamily(r) {
  return FAMILY_OF.get(r) ?? r;
}

export function kanjiSkills(grade) {
  return [
    `kanji-read-g${grade}`,
    `kanji-write-g${grade}`,
    `kanji-mean-g${grade}`,
    `kanji-radical-g${grade}`,
    `kanji-stroke-g${grade}`,
  ];
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
  const m = skillTag.match(/^kanji-(read|write|mean|radical|stroke)-g(\d)$/);
  if (!m) throw new Error(`unknown kanji skill: ${skillTag}`);
  const kind = m[1];
  const grade = Number(m[2]);
  const list = KANJI_BY_GRADE[grade];
  if (!list) throw new Error(`unknown grade: ${grade}`);
  const target = pick(rng, list);

  if (kind === "mean") {
    const answer = target.meaning;
    const otherMeanings = list
      .filter((k) => k.kanji !== target.kanji)
      .map((k) => k.meaning);
    const dummies = sampleUnique(rng, otherMeanings, 3, new Set([answer]));
    const choices = shuffle(rng, [answer, ...dummies]);
    return {
      subject: "kanji",
      skillTag,
      text: `「${target.kanji}」の いみは どれ?`,
      choices,
      answer,
      explanation: `${target.kanji} = ${target.meaning}`,
    };
  }

  if (kind === "radical") {
    const answer = target.radical;
    const fam = radicalFamily(answer);
    const otherRadicals = list
      .filter((k) => k.kanji !== target.kanji)
      .map((k) => k.radical)
      .filter((r) => radicalFamily(r) !== fam);
    const dummies = sampleUnique(rng, otherRadicals, 3, new Set([answer]));
    const choices = shuffle(rng, [answer, ...dummies]);
    return {
      subject: "kanji",
      skillTag,
      text: `「${target.kanji}」の ぶしゅは どれ?`,
      choices,
      answer,
      explanation: `${target.kanji} の ぶしゅは ${target.radical}`,
    };
  }

  if (kind === "stroke") {
    const s = target.strokes;
    const answer = String(s);
    const cand = [s - 2, s - 1, s + 1, s + 2, s - 3, s + 3].filter(
      (x) => x >= 1 && x !== s,
    );
    const dummies = shuffle(rng, cand)
      .slice(0, 3)
      .map((x) => String(x));
    const choices = shuffle(rng, [answer, ...dummies]);
    return {
      subject: "kanji",
      skillTag,
      text: `「${target.kanji}」は 何画?`,
      choices,
      answer,
      explanation: `${target.kanji} は ${target.strokes}画`,
    };
  }

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
  const displayedYomi = target.yomi[0];
  const others = list
    .filter((k) => k.kanji !== target.kanji && !k.yomi.includes(displayedYomi))
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
