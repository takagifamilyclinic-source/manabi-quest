import { test } from "node:test";
import assert from "node:assert/strict";
import { createBattle, answer } from "../js/battle.js";

const QS = [
  { skillTag: "kuku", text: "2 × 3 = ?", answer: 6, explanation: "x" },
  { skillTag: "add-basic", text: "1 + 1 = ?", answer: 2, explanation: "y" },
];
const MON = { id: "yukibo", name: "ゆきぼう" };

test("createBattle の初期状態", () => {
  const b = createBattle(QS, MON);
  assert.equal(b.index, 0);
  assert.equal(b.hp, 2);
  assert.equal(b.maxHp, 2);
  assert.equal(b.finished, false);
  assert.deepEqual(b.results, []);
});

test("正解でHPが減り、resultsに記録される", () => {
  const { battle, correct, question } = answer(createBattle(QS, MON), 6);
  assert.equal(correct, true);
  assert.equal(question.answer, 6);
  assert.equal(battle.hp, 1);
  assert.equal(battle.correctCount, 1);
  assert.deepEqual(battle.results, [{ skillTag: "kuku", correct: true }]);
});

test("不正解はHPが減らず、記録は残る", () => {
  const { battle, correct } = answer(createBattle(QS, MON), 7);
  assert.equal(correct, false);
  assert.equal(battle.hp, 2);
  assert.deepEqual(battle.results, [{ skillTag: "kuku", correct: false }]);
});

test("文字列の答えも数値として判定される", () => {
  const { correct } = answer(createBattle(QS, MON), "6");
  assert.equal(correct, true);
});

test("全問こたえると finished になる", () => {
  let b = createBattle(QS, MON);
  b = answer(b, 6).battle;
  assert.equal(b.finished, false);
  b = answer(b, 2).battle;
  assert.equal(b.finished, true);
  assert.equal(b.correctCount, 2);
  assert.equal(b.hp, 0);
});

test("元のbattleオブジェクトは変更されない(イミュータブル)", () => {
  const b0 = createBattle(QS, MON);
  answer(b0, 6);
  assert.equal(b0.index, 0);
  assert.equal(b0.hp, 2);
});
