// 教科横断のセッション生成(純粋)。苦手重みでskillTagを選び質問を作る。
import { GRADE_SKILLS, generateQuestion } from "./math-gen.js";
import { kanjiSkills, makeKanjiQuestion } from "./kanji-quiz.js";
import { englishSkills, makeEnglishQuestion } from "./english-quiz.js";
import { scienceSkills, makeScienceQuestion } from "./science-quiz.js";
import { socialSkills, makeSocialQuestion } from "./social-quiz.js";
import { weightBySkill } from "./weakness.js";

function skillsFor(grade, subject) {
  if (subject === "math") {
    const s = GRADE_SKILLS[grade];
    if (!s) throw new Error(`unknown grade: ${grade}`);
    return s;
  }
  if (subject === "kanji") return kanjiSkills(grade);
  if (subject === "english") return englishSkills(grade);
  if (subject === "science") return scienceSkills(grade);
  if (subject === "social") return socialSkills(grade);
  throw new Error(`unknown subject: ${subject}`);
}

function weightedPick(rng, items, weights) {
  const total = weights.reduce((s, w) => s + w, 0);
  let r = rng() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r < 0) return items[i];
  }
  return items[items.length - 1];
}

export function buildSession(grade, subject, opts = {}) {
  const {
    count = 10,
    attempts = [],
    profileId = null,
    rng = Math.random,
  } = opts;
  const skills = skillsFor(grade, subject);
  const weights = weightBySkill(skills, attempts, profileId);
  const make = (skill) => {
    if (subject === "math") return generateQuestion(skill, rng);
    if (subject === "english") return makeEnglishQuestion(skill, rng);
    if (subject === "science") return makeScienceQuestion(skill, rng);
    if (subject === "social") return makeSocialQuestion(skill, rng);
    return makeKanjiQuestion(skill, rng);
  };
  return Array.from({ length: count }, () =>
    make(weightedPick(rng, skills, weights)),
  );
}
