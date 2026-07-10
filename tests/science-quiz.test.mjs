import { test } from "node:test";
import assert from "node:assert/strict";
import { scienceSkills, makeScienceQuestion } from "../js/science-quiz.js";
import { buildSession } from "../js/session.js";

test("scienceSkills: 3・4年は単元タグ配列、1・2年は空", () => {
  assert.ok(scienceSkills(3).length >= 6);
  assert.ok(scienceSkills(3).every((t) => /^sci-[a-z]+-g3$/.test(t)));
  assert.ok(scienceSkills(4).length >= 6);
  assert.ok(scienceSkills(4).every((t) => /^sci-[a-z]+-g4$/.test(t)));
  assert.deepEqual(scienceSkills(1), []);
  assert.deepEqual(scienceSkills(2), []);
});

test("makeScienceQuestion: 全単元×多数回で4択成立・正解含有・explanation付き・正解漏れなし", () => {
  for (const g of [3, 4]) {
    for (const tag of scienceSkills(g)) {
      for (let i = 0; i < 200; i++) {
        const q = makeScienceQuestion(tag);
        assert.equal(q.subject, "science");
        assert.equal(q.skillTag, tag);
        assert.equal(q.choices.length, 4);
        assert.ok(q.choices.includes(q.answer));
        assert.equal(new Set(q.choices).size, 4);
        assert.ok(q.explanation && q.explanation.length >= 1);
        assert.ok(!q.text.includes(q.answer), `問題文に正解露出: ${q.text}`);
      }
    }
  }
});

test("buildSession が science を受け付け10問返す", () => {
  const qs = buildSession(3, "science", { count: 10 });
  assert.equal(qs.length, 10);
  for (const q of qs) assert.equal(q.subject, "science");
});

test("未知のskillTag/学年はthrow", () => {
  assert.throws(() => makeScienceQuestion("sci-nope-g3"));
  assert.throws(() => makeScienceQuestion("sci-konchu-g9"));
});
