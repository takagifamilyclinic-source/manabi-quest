import { test } from "node:test";
import assert from "node:assert/strict";
import {
  levelFromXp,
  sessionGain,
  addCapture,
  isEvolved,
  ownedCount,
} from "../js/progress-calc.js";

test("levelFromXp 境界", () => {
  assert.deepEqual(levelFromXp(0), { level: 1, inLevel: 0, need: 100 });
  assert.deepEqual(levelFromXp(99), { level: 1, inLevel: 99, need: 100 });
  assert.deepEqual(levelFromXp(100), { level: 2, inLevel: 0, need: 200 });
  assert.deepEqual(levelFromXp(299), { level: 2, inLevel: 199, need: 200 });
  assert.deepEqual(levelFromXp(300), { level: 3, inLevel: 0, need: 300 });
});

test("levelFromXp 単調(XPが増えるとレベルは下がらない)", () => {
  let prev = 1;
  for (let xp = 0; xp <= 5000; xp += 37) {
    const l = levelFromXp(xp).level;
    assert.ok(l >= prev, `xp=${xp} level=${l}`);
    prev = l;
  }
});

test("sessionGain: 正解数からXP/ポイント", () => {
  assert.deepEqual(sessionGain({ correctCount: 10 }), { xp: 150, points: 15 });
  assert.deepEqual(sessionGain({ correctCount: 0 }), { xp: 50, points: 5 });
});

test("addCapture は元を壊さず回数を増やす", () => {
  const c0 = { yukibo: 2 };
  const c1 = addCapture(c0, "yukibo");
  assert.equal(c1.yukibo, 3);
  assert.equal(c0.yukibo, 2);
  assert.equal(addCapture({}, "akitan").akitan, 1);
});

test("isEvolved は3回以上で真", () => {
  assert.equal(isEvolved({ yukibo: 2 }, "yukibo"), false);
  assert.equal(isEvolved({ yukibo: 3 }, "yukibo"), true);
  assert.equal(isEvolved({}, "yukibo"), false);
});

test("ownedCount は種類数", () => {
  assert.equal(ownedCount({ a: 1, b: 5 }), 2);
  assert.equal(ownedCount({}), 0);
});
