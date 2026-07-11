import { test } from "node:test";
import assert from "node:assert/strict";
import { socialSkills, makeSocialQuestion } from "../js/social-quiz.js";
import { buildSession } from "../js/session.js";

test("socialSkills: 3・4年は単元タグ配列、1・2年は空", () => {
  assert.ok(socialSkills(3).length >= 5);
  assert.ok(socialSkills(3).every((t) => /^soc-[a-z]+-g3$/.test(t)));
  assert.ok(socialSkills(4).length >= 5);
  assert.ok(socialSkills(4).every((t) => /^soc-[a-z]+-g4$/.test(t)));
  assert.deepEqual(socialSkills(1), []);
  assert.deepEqual(socialSkills(2), []);
});

test("makeSocialQuestion: 全単元×多数回で4択成立・正解含有・explanation付き・正解漏れなし", () => {
  for (const g of [3, 4]) {
    for (const tag of socialSkills(g)) {
      for (let i = 0; i < 200; i++) {
        const q = makeSocialQuestion(tag);
        assert.equal(q.subject, "social");
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

test("buildSession が social を受け付け10問返す", () => {
  const qs = buildSession(3, "social", { count: 10 });
  assert.equal(qs.length, 10);
  for (const q of qs) assert.equal(q.subject, "social");
});

test("未知のskillTag/学年はthrow", () => {
  assert.throws(() => makeSocialQuestion("soc-nope-g3"));
  assert.throws(() => makeSocialQuestion("soc-chizu-g9"));
});
