import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BADGES,
  badgeContext,
  badgeStatus,
  earnedBadges,
  newBadges,
  subjectOfTag,
} from "../js/badges.js";

function makeState(over = {}, attempts = []) {
  return {
    progress: {
      p1: {
        streak: 0,
        bestStreak: 0,
        lastPlayedDate: null,
        captures: {},
        sessions: 0,
        xp: 0,
        points: 0,
        title: null,
        ...over,
      },
    },
    attempts,
  };
}
const IDS = Array.from({ length: 20 }, (_, i) => `m${i + 1}`);

test("バッジは21種・IDユニーク・全てに name/emoji/target/unit", () => {
  assert.equal(BADGES.length, 21);
  assert.equal(new Set(BADGES.map((b) => b.id)).size, 21);
  for (const b of BADGES) {
    assert.ok(b.name && b.emoji && b.unit, b.id);
    assert.ok(Number.isInteger(b.target) && b.target >= 1, b.id);
  }
});

test("初期状態は獲得ゼロ", () => {
  const ctx = badgeContext(makeState(), "p1", IDS);
  assert.equal(earnedBadges(ctx).size, 0);
});

test("れんぞくバッジは bestStreak で判定(現streakが切れても消えない)", () => {
  const ctx = badgeContext(makeState({ streak: 1, bestStreak: 7 }), "p1", IDS);
  const e = earnedBadges(ctx);
  assert.ok(e.has("streak-3") && e.has("streak-7"));
  assert.ok(!e.has("streak-14"));
});

test("レベルバッジ: xp300=Lv3", () => {
  const e = earnedBadges(badgeContext(makeState({ xp: 300 }), "p1", IDS));
  assert.ok(e.has("level-3"));
  assert.ok(!e.has("level-5"));
});

test("ずかん・しんかバッジ", () => {
  const captures = {};
  IDS.slice(0, 5).forEach((id) => (captures[id] = 1));
  captures[IDS[0]] = 3; // 1体だけ進化(3回捕獲)
  const e = earnedBadges(badgeContext(makeState({ captures }), "p1", IDS));
  assert.ok(e.has("zukan-5") && !e.has("zukan-10"));
  assert.ok(e.has("evolve-1") && !e.has("evolve-20"));
});

test("ぜんぶしんか: 20体全て3回以上", () => {
  const captures = {};
  IDS.forEach((id) => (captures[id] = 3));
  const e = earnedBadges(badgeContext(makeState({ captures }), "p1", IDS));
  assert.ok(e.has("zukan-20") && e.has("evolve-20"));
});

test("バトル回数バッジ", () => {
  const e = earnedBadges(badgeContext(makeState({ sessions: 50 }), "p1", IDS));
  assert.ok(e.has("battle-10") && e.has("battle-50") && !e.has("battle-100"));
});

test("教科バッジ: kanji-プレフィックスで振り分け・他人と不正解は数えない", () => {
  const attempts = [];
  for (let i = 0; i < 100; i++)
    attempts.push({
      profileId: "p1",
      skillTag: "kanji-read-g3",
      correct: true,
      date: "2026-07-10",
    });
  for (let i = 0; i < 99; i++)
    attempts.push({
      profileId: "p1",
      skillTag: "mul-1",
      correct: true,
      date: "2026-07-10",
    });
  attempts.push({
    profileId: "p2",
    skillTag: "mul-1",
    correct: true,
    date: "2026-07-10",
  });
  attempts.push({
    profileId: "p1",
    skillTag: "mul-1",
    correct: false,
    date: "2026-07-10",
  });
  const e = earnedBadges(badgeContext(makeState({}, attempts), "p1", IDS));
  assert.ok(e.has("kanji-100"));
  assert.ok(!e.has("math-100")); // 算数正解は99問
});

test("badgeStatus: current は target で頭打ち", () => {
  const b = BADGES.find((x) => x.id === "battle-10");
  const st = badgeStatus(
    b,
    badgeContext(makeState({ sessions: 999 }), "p1", IDS),
  );
  assert.deepEqual(st, { current: 10, target: 10, earned: true });
});

test("badgeStatus: 未獲得は現在値と目標を返す(あと表示用)", () => {
  const b = BADGES.find((x) => x.id === "battle-50");
  const st = badgeStatus(
    b,
    badgeContext(makeState({ sessions: 38 }), "p1", IDS),
  );
  assert.deepEqual(st, { current: 38, target: 50, earned: false });
});

test("newBadges: 差分のみ・定義順で返す", () => {
  const before = new Set(["streak-3"]);
  const after = new Set(["streak-3", "streak-7", "battle-10"]);
  assert.deepEqual(
    newBadges(before, after).map((b) => b.id),
    ["streak-7", "battle-10"],
  );
});

test("subjectOfTag: プレフィックスで教科判定", () => {
  assert.equal(subjectOfTag("kanji-read-g3"), "kanji");
  assert.equal(subjectOfTag("eng-mean-g1"), "english");
  assert.equal(subjectOfTag("sci-x-g3"), "science");
  assert.equal(subjectOfTag("soc-x-g4"), "social");
  assert.equal(subjectOfTag("mul-1"), "math");
  assert.equal(subjectOfTag("add-2digit"), "math");
});

test("英語の正解は算数・漢字バッジに算入されない", () => {
  const attempts = [];
  for (let i = 0; i < 150; i++)
    attempts.push({
      profileId: "p1",
      skillTag: "eng-mean-g1",
      correct: true,
      date: "2026-07-10",
    });
  const e = earnedBadges(badgeContext(makeState({}, attempts), "p1", IDS));
  assert.ok(!e.has("math-100"), "eng-がmath-100に算入された");
  assert.ok(!e.has("kanji-100"));
});
