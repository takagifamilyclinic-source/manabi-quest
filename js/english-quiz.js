// 英語の出題ビルダ(純粋)。英→日(mean)・日→英(word)を同一元データから生成。
import { ENGLISH_G1 } from "../data/english/g1.js";
import { ENGLISH_G2 } from "../data/english/g2.js";
import { ENGLISH_G3 } from "../data/english/g3.js";
import { ENGLISH_G4 } from "../data/english/g4.js";
import { pick, sampleUnique, shuffle } from "./quiz-util.js";

export const ENGLISH_BY_GRADE = {
  1: ENGLISH_G1,
  2: ENGLISH_G2,
  3: ENGLISH_G3,
  4: ENGLISH_G4,
};

export function englishSkills(grade) {
  return [`eng-mean-g${grade}`, `eng-word-g${grade}`];
}

export function makeEnglishQuestion(skillTag, rng = Math.random) {
  const m = skillTag.match(/^eng-(mean|word)-g(\d)$/);
  if (!m) throw new Error(`unknown english skill: ${skillTag}`);
  const kind = m[1];
  const grade = Number(m[2]);
  const list = ENGLISH_BY_GRADE[grade];
  if (!list) throw new Error(`unknown grade: ${grade}`);
  const target = pick(rng, list);
  const kanaNote = grade <= 2 ? `（${target.kana}）` : "";

  if (kind === "mean") {
    const answer = target.meaning;
    const others = list
      .filter((e) => e.word !== target.word)
      .map((e) => e.meaning);
    const dummies = sampleUnique(rng, others, 3, new Set([answer]));
    return {
      subject: "english",
      skillTag,
      text: `${target.word}${kanaNote} の いみは どれ?`,
      choices: shuffle(rng, [answer, ...dummies]),
      answer,
      speak: target.word,
      explanation: `${target.word}（${target.kana}）= ${target.meaning}`,
    };
  }

  const answer = target.word;
  const others = list.filter((e) => e.word !== target.word).map((e) => e.word);
  const dummies = sampleUnique(rng, others, 3, new Set([answer]));
  return {
    subject: "english",
    skillTag,
    text: `「${target.meaning}」を えいごで いうと?`,
    choices: shuffle(rng, [answer, ...dummies]),
    answer,
    explanation: `${target.meaning} = ${target.word}（${target.kana}）`,
  };
}
