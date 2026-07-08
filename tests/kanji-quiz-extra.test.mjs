import { test } from "node:test";
import assert from "node:assert/strict";
import { makeKanjiQuestion, kanjiSkills } from "../js/kanji-quiz.js";
import { KANJI_G1 } from "../data/kanji/g1.js";

test("g1データに radical と strokes がある", () => {
  for (const k of KANJI_G1) {
    assert.ok(k.radical && [...k.radical].length >= 1, k.kanji);
    assert.ok(Number.isInteger(k.strokes) && k.strokes >= 1, k.kanji);
  }
});
test("g1のスキルに意味・部首・筆順が含まれる", () => {
  const s = kanjiSkills(1);
  for (const t of ["kanji-mean-g1", "kanji-radical-g1", "kanji-stroke-g1"])
    assert.ok(s.includes(t));
});
test("g3は読み書きのみ(意味部首筆順を含まない)", () => {
  assert.deepEqual(kanjiSkills(3), ["kanji-read-g3", "kanji-write-g3"]);
});
test("意味問題: choices4つ・正解含む・重複なし", () => {
  for (let i = 0; i < 300; i++) {
    const q = makeKanjiQuestion("kanji-mean-g1");
    assert.equal(q.choices.length, 4);
    assert.equal(new Set(q.choices).size, 4);
    assert.ok(q.choices.includes(q.answer));
  }
});
test("部首・筆順問題: choices4つ・正解含む・重複なし", () => {
  for (const tag of [
    "kanji-radical-g1",
    "kanji-stroke-g1",
    "kanji-radical-g2",
    "kanji-stroke-g2",
  ]) {
    for (let i = 0; i < 300; i++) {
      const q = makeKanjiQuestion(tag);
      assert.equal(q.choices.length, 4, tag);
      assert.equal(new Set(q.choices).size, 4, tag);
      assert.ok(q.choices.includes(q.answer), tag);
    }
  }
});
