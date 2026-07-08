import { test } from "node:test";
import assert from "node:assert/strict";
import { weaknessTop } from "../js/weakness.js";

const A = (skillTag, c, n) =>
  Array.from({ length: n }, () => ({
    profileId: "p1",
    skillTag,
    correct: c,
    date: "x",
  }));

test("正答率の低い順・tries付き・実績あるものだけ", () => {
  const attempts = [
    ...A("a", false, 4),
    ...A("a", true, 1),
    ...A("b", true, 5),
  ];
  const top = weaknessTop(attempts, "p1", 5);
  assert.equal(top[0].skillTag, "a");
  assert.ok(Math.abs(top[0].rate - 0.2) < 1e-9);
  assert.equal(top[0].tries, 5);
  assert.equal(top.find((t) => t.skillTag === "b").rate, 1);
});
test("他プロフィール除外・n件まで", () => {
  const attempts = [
    { profileId: "p2", skillTag: "a", correct: false, date: "x" },
  ];
  assert.deepEqual(weaknessTop(attempts, "p1", 5), []);
});
