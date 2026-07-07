import { test } from "node:test";
import assert from "node:assert/strict";
import { todayString, updateStreak } from "../js/streak.js";

test("todayString はローカル日付をYYYY-MM-DDで返す", () => {
  assert.equal(todayString(new Date(2026, 6, 7)), "2026-07-07");
  assert.equal(todayString(new Date(2026, 0, 1)), "2026-01-01");
});

test("初回プレイで streak=1", () => {
  const r = updateStreak({ streak: 0, lastPlayedDate: null }, "2026-07-07");
  assert.deepEqual(r, { streak: 1, lastPlayedDate: "2026-07-07" });
});

test("同じ日に2回やっても増えない", () => {
  const r = updateStreak(
    { streak: 3, lastPlayedDate: "2026-07-07" },
    "2026-07-07",
  );
  assert.equal(r.streak, 3);
});

test("昨日やっていれば +1", () => {
  const r = updateStreak(
    { streak: 3, lastPlayedDate: "2026-07-06" },
    "2026-07-07",
  );
  assert.equal(r.streak, 4);
});

test("月またぎでも昨日判定できる", () => {
  const r = updateStreak(
    { streak: 5, lastPlayedDate: "2026-06-30" },
    "2026-07-01",
  );
  assert.equal(r.streak, 6);
});

test("1日以上あくと 1 にリセット", () => {
  const r = updateStreak(
    { streak: 9, lastPlayedDate: "2026-07-04" },
    "2026-07-07",
  );
  assert.equal(r.streak, 1);
});
