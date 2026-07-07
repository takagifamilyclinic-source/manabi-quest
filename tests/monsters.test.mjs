import { test } from "node:test";
import assert from "node:assert/strict";
import { MONSTERS } from "../data/monsters.js";

test("モンスターは20体で、idが重複しない", () => {
  assert.equal(MONSTERS.length, 20);
  assert.equal(new Set(MONSTERS.map((m) => m.id)).size, 20);
});

test("全モンスターが必須フィールドを持つ", () => {
  const TYPES = ["ゆき", "まつり", "たべもの", "しぜん", "でんせつ"];
  const RARITIES = ["N", "R", "SR"];
  for (const m of MONSTERS) {
    assert.ok(m.id && m.name && m.emoji && m.motifEn, m.id);
    assert.ok(TYPES.includes(m.type), `${m.id}: type=${m.type}`);
    assert.ok(RARITIES.includes(m.rarity), `${m.id}: rarity=${m.rarity}`);
    assert.ok(m.trivia.length >= 10, `${m.id}: 豆知識が短すぎる`);
  }
});

test("レア度の構成: SR2体・R8体・N10体", () => {
  const count = (r) => MONSTERS.filter((m) => m.rarity === r).length;
  assert.equal(count("SR"), 2);
  assert.equal(count("R"), 8);
  assert.equal(count("N"), 10);
});
