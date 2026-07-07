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

test("mul-2x2 は2桁×2桁で答えが正しい", () => {
  for (let i = 0; i < 300; i++) {
    const q = generateQuestion("mul-2x2");
    const [, a, , b] = q.text.match(NUM_RE).map(Number);
    assert.ok(a >= 11 && a <= 99 && b >= 11 && b <= 99, `${a}×${b}`);
    assert.equal(a * b, q.answer);
  }
});

test("big-add は4桁どうしのたし算で答えが正しい", () => {
  for (let i = 0; i < 300; i++) {
    const q = generateQuestion("big-add");
    const [, a, , b] = q.text.match(NUM_RE).map(Number);
    assert.ok(a >= 1000 && a <= 9999 && b >= 1000 && b <= 9999, `${a}+${b}`);
    assert.equal(a + b, q.answer);
  }
});

test("全スキルが解説つきの問題を返す(全学年)", () => {
  for (const grade of [1, 2, 3, 4]) {
    for (const s of GRADE_SKILLS[grade]) {
      const q = generateQuestion(s);
      assert.equal(q.skillTag, s);
      assert.ok(q.text.includes("?"));
      assert.ok(Number.isInteger(q.answer));
      assert.ok(q.explanation.length > 0);
    }
  }
});

test("1年生に九九・わり算・かけ算は出ない(学年別カリキュラム)", () => {
  const g1 = GRADE_SKILLS[1];
  for (const forbidden of [
    "kuku",
    "div-basic",
    "mul-2x1",
    "mul-2x2",
    "add-3digit",
    "sub-3digit",
    "big-add",
  ]) {
    assert.ok(!g1.includes(forbidden), `1年に ${forbidden} が混ざっている`);
  }
  // 1年はたし算ひき算のみ
  assert.deepEqual(g1, ["add-basic", "add-carry", "sub-basic", "sub-borrow"]);
  // 九九は2年から
  assert.ok(GRADE_SKILLS[2].includes("kuku"));
  // わり算は3年から(1・2年には無い)
  assert.ok(!GRADE_SKILLS[2].includes("div-basic"));
  assert.ok(GRADE_SKILLS[3].includes("div-basic"));
  // 2桁×2桁・大きな数は4年のみ
  assert.ok(GRADE_SKILLS[4].includes("mul-2x2"));
  assert.ok(GRADE_SKILLS[4].includes("big-add"));
  assert.ok(!GRADE_SKILLS[3].includes("mul-2x2"));
});

test("generateSession は指定学年のスキルだけで指定数を返す", () => {
  for (const grade of [1, 2, 3, 4]) {
    const qs = generateSession(grade, 10);
    assert.equal(qs.length, 10);
    for (const q of qs) assert.ok(GRADE_SKILLS[grade].includes(q.skillTag));
  }
});

test("未知のスキル・未知の学年はエラー", () => {
  assert.throws(() => generateQuestion("nazo"));
  assert.throws(() => generateSession("low", 10));
  assert.throws(() => generateSession(5, 10));
});
