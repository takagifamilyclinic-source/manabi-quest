import { test } from "node:test";
import assert from "node:assert/strict";
import { MONSTERS } from "../data/monsters.js";

test("全モンスターに evolveName(1字以上)と evolveImg フィールド", () => {
  for (const m of MONSTERS) {
    assert.ok(m.evolveName && [...m.evolveName].length >= 1, m.id);
    assert.ok("evolveImg" in m, m.id);
  }
});

test("evolveName は元の name と異なる", () => {
  for (const m of MONSTERS) {
    assert.notEqual(m.evolveName, m.name, m.id);
  }
});
