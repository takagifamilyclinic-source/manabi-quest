import { test } from "node:test";
import assert from "node:assert/strict";
import { KANJI_G1 } from "../data/kanji/g1.js";

test("g1全字に radical(部首1字以上)と strokes(正の整数)がある", () => {
  for (const k of KANJI_G1) {
    assert.ok(k.radical && [...k.radical].length >= 1, `${k.kanji} radical`);
    assert.ok(
      Number.isInteger(k.strokes) && k.strokes >= 1 && k.strokes <= 30,
      `${k.kanji} strokes=${k.strokes}`,
    );
  }
});
