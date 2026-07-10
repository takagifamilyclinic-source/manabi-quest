import { test } from "node:test";
import assert from "node:assert/strict";
import { ENGLISH_G1 } from "../data/english/g1.js";
import { ENGLISH_G2 } from "../data/english/g2.js";
import { ENGLISH_G3 } from "../data/english/g3.js";
import { ENGLISH_G4 } from "../data/english/g4.js";

export function validateGrade(list, label) {
  assert.equal(list.length, 60, `${label} は60語`);
  assert.equal(new Set(list.map((e) => e.word)).size, 60, `${label} word重複`);
  assert.equal(
    new Set(list.map((e) => e.meaning)).size,
    60,
    `${label} meaning重複`,
  );
  for (const e of list) {
    assert.match(e.word, /^[a-z][a-z' ]*$/, `${label} word形式: ${e.word}`);
    assert.match(
      e.kana,
      /^[ァ-ヶー・\s]+$/u,
      `${label} kana形式: ${e.word}=${e.kana}`,
    );
    assert.ok(
      e.meaning && e.meaning.length >= 1,
      `${label} meaning空: ${e.word}`,
    );
    assert.ok(
      e.category && e.category.length >= 1,
      `${label} category空: ${e.word}`,
    );
  }
}

test("英語g1: 60語・形式・重複なし", () => validateGrade(ENGLISH_G1, "g1"));
test("英語g2: 60語・形式・重複なし", () => validateGrade(ENGLISH_G2, "g2"));
test("英語g3: 60語・形式・重複なし", () => validateGrade(ENGLISH_G3, "g3"));
test("英語g4: 60語・形式・重複なし", () => validateGrade(ENGLISH_G4, "g4"));

test("全240語: 学年をまたいで word がユニーク", () => {
  const all = [...ENGLISH_G1, ...ENGLISH_G2, ...ENGLISH_G3, ...ENGLISH_G4];
  assert.equal(all.length, 240);
  const dup = all.map((e) => e.word).filter((w, i, a) => a.indexOf(w) !== i);
  assert.deepEqual(dup, [], `学年間で重複: ${dup.join(",")}`);
});
