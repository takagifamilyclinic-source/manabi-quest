import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSession } from "../js/session.js";
import { GRADE_SKILLS } from "../js/math-gen.js";
import { kanjiSkills } from "../js/kanji-quiz.js";

test("math: 指定学年のskillのみ・count個・choicesなし", () => {
  const qs = buildSession(1, "math", { count: 10 });
  assert.equal(qs.length, 10);
  for (const q of qs) {
    assert.ok(GRADE_SKILLS[1].includes(q.skillTag));
    assert.equal(q.choices, undefined);
  }
});

test("kanji: 指定学年の漢字skillのみ・choices4つ", () => {
  const qs = buildSession(2, "kanji", { count: 10 });
  assert.equal(qs.length, 10);
  for (const q of qs) {
    assert.ok(kanjiSkills(2).includes(q.skillTag));
    assert.equal(q.choices.length, 4);
  }
});

test("苦手(正答率0)のskillが多めに選ばれる", () => {
  const attempts = Array.from({ length: 20 }, () => ({
    profileId: "p1",
    skillTag: "add-basic",
    correct: false,
    date: "x",
  }));
  const rng = mulberry32(42);
  const qs = buildSession(1, "math", {
    count: 200,
    attempts,
    profileId: "p1",
    rng,
  });
  const n = qs.filter((q) => q.skillTag === "add-basic").length;
  assert.ok(n > 70, `add-basic=${n}`);
});

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
