import { test } from "node:test";
import assert from "node:assert/strict";
import { KANJI_G1 } from "../data/kanji/g1.js";

test("1年は80字・重複なし", () => {
  assert.equal(KANJI_G1.length, 80);
  assert.equal(new Set(KANJI_G1.map((k) => k.kanji)).size, 80);
});
test("全字が grade=1・yomi≥1・meaning・単一漢字", () => {
  for (const k of KANJI_G1) {
    assert.equal(k.grade, 1, k.kanji);
    assert.ok(Array.isArray(k.yomi) && k.yomi.length >= 1, k.kanji);
    assert.ok([...k.kanji].length === 1, `${k.kanji} は1字でない`);
    assert.ok(k.meaning && k.meaning.length >= 1, k.kanji);
  }
});
