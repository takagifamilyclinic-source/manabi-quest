import { test } from "node:test";
import assert from "node:assert/strict";
import { KANJI_G3 } from "../data/kanji/g3.js";
import { isValidRadical } from "./radical-sets.mjs";

test("3年は200字・重複なし", () => {
  assert.equal(KANJI_G3.length, 200);
  assert.equal(new Set(KANJI_G3.map((k) => k.kanji)).size, 200);
});
test("全字が grade=3・yomi≥1・meaning・単一漢字", () => {
  for (const k of KANJI_G3) {
    assert.equal(k.grade, 3, k.kanji);
    assert.ok(Array.isArray(k.yomi) && k.yomi.length >= 1, k.kanji);
    assert.ok([...k.kanji].length === 1, `${k.kanji} は1字でない`);
    assert.ok(k.meaning && k.meaning.length >= 1, k.kanji);
  }
});

test("g3全字に radical(妥当な部首)と strokes(1〜20の整数)がある", () => {
  for (const k of KANJI_G3) {
    assert.ok(
      k.radical && isValidRadical(k.radical),
      `${k.kanji} radical=${k.radical}`,
    );
    assert.ok(
      Number.isInteger(k.strokes) && k.strokes >= 1 && k.strokes <= 20,
      `${k.kanji} strokes=${k.strokes}`,
    );
  }
});
