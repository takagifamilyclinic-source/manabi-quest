import { test } from "node:test";
import assert from "node:assert/strict";
import { createBattle, answer } from "../js/battle.js";

const KQ = [
  {
    skillTag: "kanji-read-g1",
    text: "学の よみは?",
    choices: ["がく", "こう", "ねん"],
    answer: "がく",
    explanation: "がっこうの がく",
  },
];
const MON = { id: "yukibo", name: "ゆきぼう" };

test("選択肢問題は文字列の完全一致で正解判定", () => {
  const r = answer(createBattle(KQ, MON), "がく");
  assert.equal(r.correct, true);
});
test("選択肢問題で違う選択肢は不正解", () => {
  const r = answer(createBattle(KQ, MON), "こう");
  assert.equal(r.correct, false);
});
test("数値問題は従来どおり Number 比較(文字列入力OK)", () => {
  const mq = [{ skillTag: "kuku", text: "2×3=?", answer: 6, explanation: "x" }];
  assert.equal(answer(createBattle(mq, MON), "6").correct, true);
  assert.equal(answer(createBattle(mq, MON), "7").correct, false);
});
