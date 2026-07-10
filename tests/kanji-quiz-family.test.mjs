import { test } from "node:test";
import assert from "node:assert/strict";
import { makeKanjiQuestion, radicalFamily } from "../js/kanji-quiz.js";

test("radicalFamily: 同族は同キー・非同族は自身を返す", () => {
  assert.equal(radicalFamily("氵"), radicalFamily("水"));
  assert.equal(radicalFamily("刂"), radicalFamily("刀"));
  assert.equal(radicalFamily("ネ"), radicalFamily("示"));
  assert.equal(radicalFamily("ツ"), radicalFamily("⺍"));
  assert.notEqual(radicalFamily("氵"), radicalFamily("火"));
  assert.equal(radicalFamily("口"), "口");
});

test("部首問題: 正解と同族の部首はダミーに並ばない(全学年・多数回)", () => {
  for (const g of [1, 2, 3, 4]) {
    for (let i = 0; i < 500; i++) {
      const q = makeKanjiQuestion(`kanji-radical-g${g}`);
      assert.equal(q.choices.length, 4, `g${g} 4択が崩れた`);
      assert.equal(new Set(q.choices).size, 4, `g${g} 重複`);
      const fam = radicalFamily(q.answer);
      for (const d of q.choices.filter((c) => c !== q.answer))
        assert.notEqual(
          radicalFamily(d),
          fam,
          `g${g} ${q.text} 正解=${q.answer} ダミー=${d}`,
        );
    }
  }
});
