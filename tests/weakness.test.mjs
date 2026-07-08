import { test } from "node:test";
import assert from "node:assert/strict";
import { weightBySkill } from "../js/weakness.js";

const A = (skillTag, correct, n) =>
  Array.from({ length: n }, () => ({
    profileId: "p1",
    skillTag,
    correct,
    date: "2026-07-08",
  }));

test("実績ゼロは全て重み1", () => {
  const w = weightBySkill(["a", "b"], [], "p1");
  assert.deepEqual(w, [1, 1]);
});

test("正答率が低いスキルほど重みが大きい", () => {
  const attempts = [...A("a", false, 10), ...A("b", true, 10)];
  const [wa, wb] = weightBySkill(["a", "b"], attempts, "p1");
  assert.ok(wa > wb, `wa=${wa} wb=${wb}`);
  assert.ok(wb >= 1);
});

test("他プロフィールの実績は無視", () => {
  const attempts = [
    { profileId: "p2", skillTag: "a", correct: false, date: "x" },
  ];
  assert.deepEqual(weightBySkill(["a"], attempts, "p1"), [1]);
});

test("全問正解でも重みは1以上(下限)", () => {
  const [w] = weightBySkill(["a"], A("a", true, 20), "p1");
  assert.ok(w >= 1);
});
