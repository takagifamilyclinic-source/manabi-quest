import { test } from "node:test";
import assert from "node:assert/strict";
import { exchangeReward, defaultState } from "../js/state.js";

function withPoints(n) {
  const s = defaultState();
  s.progress.p1.points = n;
  s.settings.rewards = [{ id: "r1", name: "アイス", cost: 50 }];
  return s;
}

test("残高十分: ポイント減算・ログ記録・ok", () => {
  const { ok, state } = exchangeReward(
    withPoints(60),
    "p1",
    { id: "r1", name: "アイス", cost: 50 },
    "2026-07-08",
  );
  assert.equal(ok, true);
  assert.equal(state.progress.p1.points, 10);
  assert.equal(state.settings.rewardLog.length, 1);
  assert.deepEqual(state.settings.rewardLog[0], {
    date: "2026-07-08",
    profileId: "p1",
    name: "アイス",
    cost: 50,
  });
});

test("残高不足: ok=false・stateは変わらない", () => {
  const before = withPoints(30);
  const { ok, state } = exchangeReward(
    before,
    "p1",
    { id: "r1", name: "アイス", cost: 50 },
    "2026-07-08",
  );
  assert.equal(ok, false);
  assert.equal(state.progress.p1.points, 30);
  assert.equal(state.settings.rewardLog.length, 0);
});

test("ちょうど残高と同額なら交換できる(境界)", () => {
  const { ok, state } = exchangeReward(
    withPoints(50),
    "p1",
    { id: "r1", name: "アイス", cost: 50 },
    "2026-07-08",
  );
  assert.equal(ok, true);
  assert.equal(state.progress.p1.points, 0);
});
