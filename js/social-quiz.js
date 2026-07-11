// 社会の出題ビルダ(純粋)。1問=Q＋正解＋手書き誤答3＋まめ知識。3・4年のみ。
import { SOCIAL_G3 } from "../data/social/g3.js";
import { SOCIAL_G4 } from "../data/social/g4.js";
import { pick, shuffle } from "./quiz-util.js";

export const SOCIAL_BY_GRADE = { 3: SOCIAL_G3, 4: SOCIAL_G4 };

export function socialSkills(grade) {
  const list = SOCIAL_BY_GRADE[grade];
  if (!list) return [];
  return [...new Set(list.map((e) => e.skillTag))];
}

export function makeSocialQuestion(skillTag, rng = Math.random) {
  const m = skillTag.match(/^soc-[a-z]+-g(\d)$/);
  if (!m) throw new Error(`unknown social skill: ${skillTag}`);
  const grade = Number(m[1]);
  const list = SOCIAL_BY_GRADE[grade];
  if (!list) throw new Error(`unknown grade: ${grade}`);
  const items = list.filter((e) => e.skillTag === skillTag);
  if (!items.length) throw new Error(`no items for skill: ${skillTag}`);
  const it = pick(rng, items);
  return {
    subject: "social",
    skillTag,
    text: it.q,
    choices: shuffle(rng, [it.answer, ...it.distractors]),
    answer: it.answer,
    explanation: it.explain,
  };
}
