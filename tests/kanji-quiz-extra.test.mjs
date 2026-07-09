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
test("g3/g4も全5形式を含む", () => {
  assert.deepEqual(kanjiSkills(3), [
    "kanji-read-g3",
    "kanji-write-g3",
    "kanji-mean-g3",
    "kanji-radical-g3",
    "kanji-stroke-g3",
  ]);
  assert.deepEqual(kanjiSkills(4), [
    "kanji-read-g4",
    "kanji-write-g4",
    "kanji-mean-g4",
    "kanji-radical-g4",
    "kanji-stroke-g4",
  ]);
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

test("意味問題: ダミーに『正解と同じ意味の別字』が混ざらない(正解一意)・g1/g2", () => {
  for (const g of [1, 2]) {
    for (let i = 0; i < 500; i++) {
      const q = makeKanjiQuestion(`kanji-mean-g${g}`);
      // answer 以外の choices は answer と異なる文字列であること(同義でも値が違えば別選択肢)
      const dupes = q.choices.filter((c) => c === q.answer);
      assert.equal(dupes.length, 1, `${g}年 意味「${q.answer}」で正解が重複`);
    }
  }
});

test("部首問題: choices内に正解の部首値が1つだけ(正解一意)・g1/g2", () => {
  for (const g of [1, 2]) {
    for (let i = 0; i < 500; i++) {
      const q = makeKanjiQuestion(`kanji-radical-g${g}`);
      const dupes = q.choices.filter((c) => c === q.answer);
      assert.equal(dupes.length, 1, `${g}年 部首「${q.answer}」で正解が重複`);
    }
  }
});

test("意味問題(g2)も4択・正解含む(mean-g2カバレッジ)", () => {
  for (let i = 0; i < 300; i++) {
    const q = makeKanjiQuestion("kanji-mean-g2");
    assert.equal(q.choices.length, 4);
    assert.equal(new Set(q.choices).size, 4);
    assert.ok(q.choices.includes(q.answer));
  }
});

test("g3/g4の意味・部首・画数問題: 4択・正解含有・重複なし", () => {
  for (const tag of [
    "kanji-mean-g3",
    "kanji-radical-g3",
    "kanji-stroke-g3",
    "kanji-mean-g4",
    "kanji-radical-g4",
    "kanji-stroke-g4",
  ]) {
    for (let i = 0; i < 200; i++) {
      const q = makeKanjiQuestion(tag);
      assert.equal(q.choices.length, 4, `${tag} choices at ${i}`);
      assert.ok(q.choices.includes(q.answer), `${tag} answer missing at ${i}`);
      assert.equal(new Set(q.choices).size, 4, `${tag} dup at ${i}`);
    }
  }
});
