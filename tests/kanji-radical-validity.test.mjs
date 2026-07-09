import { test } from "node:test";
import assert from "node:assert/strict";
import { KANJI_BY_GRADE } from "../js/kanji-quiz.js";
import { isValidRadical } from "./radical-sets.mjs";

test("全642字: radicalは妥当な部首・strokesは1〜20の整数", () => {
  let total = 0;
  for (const grade of [1, 2, 3, 4]) {
    for (const k of KANJI_BY_GRADE[grade]) {
      total++;
      assert.ok(
        isValidRadical(k.radical),
        `g${grade} ${k.kanji} radical=${k.radical}`,
      );
      assert.ok(
        Number.isInteger(k.strokes) && k.strokes >= 1 && k.strokes <= 20,
        `g${grade} ${k.kanji} strokes=${k.strokes}`,
      );
    }
  }
  assert.equal(total, 642);
});
