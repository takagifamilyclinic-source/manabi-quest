// 理科の出題ビルダ(純粋)。1問=Q＋正解＋手書き誤答3＋まめ知識。3・4年のみ。
import { SCIENCE_G3 } from "../data/science/g3.js";
import { SCIENCE_G4 } from "../data/science/g4.js";
import { pick, shuffle } from "./quiz-util.js";

export const SCIENCE_BY_GRADE = { 3: SCIENCE_G3, 4: SCIENCE_G4 };

export function scienceSkills(grade) {
  const list = SCIENCE_BY_GRADE[grade];
  if (!list) return [];
  return [...new Set(list.map((e) => e.skillTag))];
}

export function makeScienceQuestion(skillTag, rng = Math.random) {
  const m = skillTag.match(/^sci-[a-z]+-g(\d)$/);
  if (!m) throw new Error(`unknown science skill: ${skillTag}`);
  const grade = Number(m[1]);
  const list = SCIENCE_BY_GRADE[grade];
  if (!list) throw new Error(`unknown grade: ${grade}`);
  const items = list.filter((e) => e.skillTag === skillTag);
  if (!items.length) throw new Error(`no items for skill: ${skillTag}`);
  const it = pick(rng, items);
  return {
    subject: "science",
    skillTag,
    text: it.q,
    choices: shuffle(rng, [it.answer, ...it.distractors]),
    answer: it.answer,
    explanation: it.explain,
  };
}
