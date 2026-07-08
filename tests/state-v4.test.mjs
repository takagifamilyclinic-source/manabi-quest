import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultState, recordSession } from "../js/state.js";

test("defaultState v4: xp/points/captures と settings.rewards", () => {
  const s = defaultState();
  assert.equal(s.version, 4);
  for (const p of s.profiles) {
    const pr = s.progress[p.id];
    assert.equal(pr.xp, 0);
    assert.equal(pr.points, 0);
    assert.deepEqual(pr.captures, {});
    assert.equal(pr.monsters, undefined);
  }
  assert.deepEqual(s.settings.rewards, []);
  assert.deepEqual(s.settings.rewardLog, []);
});

test("recordSession: captures加算・xp/points加算・streak/sessions", () => {
  const battle = {
    monster: { id: "yukibo" },
    correctCount: 8,
    results: [{ skillTag: "kuku", correct: true }],
    finished: true,
  };
  const s1 = recordSession(defaultState(), "p1", battle, "2026-07-08");
  const pr = s1.progress.p1;
  assert.equal(pr.captures.yukibo, 1);
  assert.equal(pr.xp, 8 * 10 + 50, "xp = correctCount * 10 + 50");
  assert.equal(pr.points, 8 + 5, "points = correctCount + 5");
  assert.equal(pr.sessions, 1);
  assert.equal(pr.streak, 1);
  assert.equal(s1.attempts.length, 1);
  const s2 = recordSession(s1, "p1", battle, "2026-07-08");
  assert.equal(s2.progress.p1.captures.yukibo, 2);
  assert.equal(s2.progress.p1.xp, 260, "xp should accumulate: 130 + 130 = 260");
});
