import { test } from "node:test";
import assert from "node:assert/strict";
import {
  makeKanjiQuestion,
  kanjiSkills,
  KANJI_BY_GRADE,
} from "../js/kanji-quiz.js";

test("kanjiSkills は読み・書きを返す", () => {
  assert.deepEqual(kanjiSkills(1), ["kanji-read-g1", "kanji-write-g1"]);
  assert.deepEqual(kanjiSkills(2), ["kanji-read-g2", "kanji-write-g2"]);
  assert.deepEqual(kanjiSkills(3), ["kanji-read-g3", "kanji-write-g3"]);
  assert.deepEqual(kanjiSkills(4), ["kanji-read-g4", "kanji-write-g4"]);
});

test("読み問題: choices4つ・正解を含む・重複なし・正解はその字のyomi", () => {
  for (let i = 0; i < 400; i++) {
    const q = makeKanjiQuestion("kanji-read-g1");
    assert.equal(q.subject, "kanji");
    assert.equal(q.choices.length, 4, `choices length at iteration ${i}`);
    assert.equal(
      new Set(q.choices).size,
      4,
      `unique choices at iteration ${i}`,
    );
    assert.ok(
      q.choices.includes(q.answer),
      `answer not in choices at iteration ${i}`,
    );
    const ok = KANJI_BY_GRADE[1].some((k) => k.yomi.includes(q.answer));
    assert.ok(ok, `answer ${q.answer} not in any yomi at iteration ${i}`);
  }
});

test("読み問題 (g2): choices4つ・正解を含む・重複なし・正解はその字のyomi", () => {
  for (let i = 0; i < 100; i++) {
    const q = makeKanjiQuestion("kanji-read-g2");
    assert.equal(q.subject, "kanji");
    assert.equal(q.choices.length, 4);
    assert.equal(new Set(q.choices).size, 4);
    assert.ok(q.choices.includes(q.answer));
    const ok = KANJI_BY_GRADE[2].some((k) => k.yomi.includes(q.answer));
    assert.ok(ok, `answer ${q.answer} not in any yomi`);
  }
});

test("書き問題: choices4つ・正解は漢字・重複なし", () => {
  for (let i = 0; i < 400; i++) {
    const q = makeKanjiQuestion("kanji-write-g1");
    assert.equal(q.choices.length, 4, `choices length at iteration ${i}`);
    assert.equal(
      new Set(q.choices).size,
      4,
      `unique choices at iteration ${i}`,
    );
    assert.ok(
      q.choices.includes(q.answer),
      `answer not in choices at iteration ${i}`,
    );
    assert.equal(
      [...q.answer].length,
      1,
      `answer must be 1 char at iteration ${i}`,
    );
  }
});

test("書き問題 (g2): choices4つ・正解は漢字・重複なし", () => {
  for (let i = 0; i < 100; i++) {
    const q = makeKanjiQuestion("kanji-write-g2");
    assert.equal(q.choices.length, 4);
    assert.equal(new Set(q.choices).size, 4);
    assert.ok(q.choices.includes(q.answer));
    assert.equal([...q.answer].length, 1);
  }
});

test("未知スキルはエラー", () => {
  assert.throws(() => makeKanjiQuestion("kanji-read-g9"));
  assert.throws(() => makeKanjiQuestion("kanji-write-g0"));
  assert.throws(() => makeKanjiQuestion("unknown-skill"));
});
