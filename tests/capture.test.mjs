import { test } from "node:test";
import assert from "node:assert/strict";
import { pickEncounter } from "../js/capture.js";
import { MONSTERS } from "../data/monsters.js";

test("rng=0 なら先頭のNが出る(重み順に消費される)", () => {
  const m = pickEncounter(MONSTERS, () => 0);
  assert.ok(m, "モンスターが返る");
  assert.equal(m.id, MONSTERS[0].id);
});

test("rng=0.999999 なら末尾のモンスターが出る", () => {
  const m = pickEncounter(MONSTERS, () => 0.999999);
  assert.equal(m.id, MONSTERS[MONSTERS.length - 1].id);
});

test("レア度の出現比率がおおむね N70:R25:SR5 になる", () => {
  const counts = { N: 0, R: 0, SR: 0 };
  for (let i = 0; i < 20000; i++) counts[pickEncounter(MONSTERS).rarity]++;
  assert.ok(counts.N / 20000 > 0.6 && counts.N / 20000 < 0.8, `N=${counts.N}`);
  assert.ok(
    counts.R / 20000 > 0.17 && counts.R / 20000 < 0.33,
    `R=${counts.R}`,
  );
  assert.ok(
    counts.SR / 20000 > 0.02 && counts.SR / 20000 < 0.09,
    `SR=${counts.SR}`,
  );
});
