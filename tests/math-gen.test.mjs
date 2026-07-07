import { test } from "node:test";
import assert from "node:assert/strict";
import {
  generateQuestion,
  generateSession,
  GRADE_SKILLS,
} from "../js/math-gen.js";

const NUM_RE = /(\d+)\s*([+\-×÷])\s*(\d+)/;

test("add-carry は必ずくり上がりになる(答え11〜18)", () => {
  for (let i = 0; i < 300; i++) {
    const q = generateQuestion("add-carry");
    assert.ok(q.answer >= 11 && q.answer <= 18, `answer=${q.answer}`);
    const [, a, , b] = q.text.match(NUM_RE).map(Number);
    assert.equal(a + b, q.answer);
  }
});

test("sub-borrow は必ずくり下がりになる", () => {
  for (let i = 0; i < 300; i++) {
    const q = generateQuestion("sub-borrow");
    const [, a, , b] = q.text.match(NUM_RE).map(Number);
    assert.ok(a % 10 < b, `${a}-${b} はくり下がりではない`);
    assert.equal(a - b, q.answer);
  }
});

test("kuku の答えは正しい(1〜9の段)", () => {
  for (let i = 0; i < 300; i++) {
    const q = generateQuestion("kuku");
    const [, a, , b] = q.text.match(NUM_RE).map(Number);
    assert.ok(a >= 1 && a <= 9 && b >= 1 && b <= 9);
    assert.equal(a * b, q.answer);
  }
});

test("div-basic は必ずわり切れる", () => {
  for (let i = 0; i < 300; i++) {
    const q = generateQuestion("div-basic");
    const [, a, , b] = q.text.match(NUM_RE).map(Number);
    assert.equal(a % b, 0);
    assert.equal(a / b, q.answer);
  }
});

test("全スキルが解説つきの問題を返す", () => {
  for (const band of ["low", "mid"]) {
    for (const s of GRADE_SKILLS[band]) {
      const q = generateQuestion(s);
      assert.equal(q.skillTag, s);
      assert.ok(q.text.includes("?"));
      assert.ok(Number.isInteger(q.answer));
      assert.ok(q.explanation.length > 0);
    }
  }
});

test("generateSession は学年のスキルだけで指定数を返す", () => {
  const qs = generateSession("low", 10);
  assert.equal(qs.length, 10);
  for (const q of qs) assert.ok(GRADE_SKILLS.low.includes(q.skillTag));
});

test("未知のスキルはエラー", () => {
  assert.throws(() => generateQuestion("nazo"));
});
