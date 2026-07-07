import { test } from "node:test";
import assert from "node:assert/strict";
import { KANJI_G2 } from "../data/kanji/g2.js";

test("2年は160字・重複なし", () => {
  assert.equal(KANJI_G2.length, 160);
  assert.equal(new Set(KANJI_G2.map((k) => k.kanji)).size, 160);
});
test("全字が grade=2・yomi≥1・meaning・単一漢字", () => {
  for (const k of KANJI_G2) {
    assert.equal(k.grade, 2, k.kanji);
    assert.ok(Array.isArray(k.yomi) && k.yomi.length >= 1, k.kanji);
    assert.ok([...k.kanji].length === 1, `${k.kanji} は1字でない`);
    assert.ok(k.meaning && k.meaning.length >= 1, k.kanji);
  }
});
