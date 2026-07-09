import { test } from "node:test";
import assert from "node:assert/strict";
import { KANJI_G4 } from "../data/kanji/g4.js";
import { isValidRadical } from "./radical-sets.mjs";

test("4年は202字・重複なし", () => {
  assert.equal(KANJI_G4.length, 202);
  assert.equal(new Set(KANJI_G4.map((k) => k.kanji)).size, 202);
});
test("全字が grade=4・yomi≥1・meaning・単一漢字", () => {
  for (const k of KANJI_G4) {
    assert.equal(k.grade, 4, k.kanji);
    assert.ok(Array.isArray(k.yomi) && k.yomi.length >= 1, k.kanji);
    assert.ok([...k.kanji].length === 1, `${k.kanji} は1字でない`);
    assert.ok(k.meaning && k.meaning.length >= 1, k.kanji);
  }
});

test("g4全字に radical(妥当な部首)と strokes(1〜20の整数)がある", () => {
  for (const k of KANJI_G4) {
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
