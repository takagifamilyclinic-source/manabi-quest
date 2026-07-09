import { test } from "node:test";
import assert from "node:assert/strict";
import {
  load,
  recordSession,
  setTitle,
  defaultState,
  STORAGE_KEY,
} from "../js/state.js";

function fakeStorage(obj) {
  return {
    getItem: (k) => obj[k] ?? null,
    setItem: (k, v) => {
      obj[k] = v;
    },
  };
}

test("defaultState は v5・全プロフィールに bestStreak=0/title=null", () => {
  const s = defaultState();
  assert.equal(s.version, 5);
  for (const pid of ["p1", "p2", "p3", "p4"]) {
    assert.equal(s.progress[pid].bestStreak, 0);
    assert.equal(s.progress[pid].title, null);
  }
});

test("v4→v5移行: bestStreak=現streak・title=null・他フィールド保持", () => {
  const base = defaultState();
  const v4 = {
    version: 4,
    profiles: base.profiles,
    progress: {
      p1: {
        streak: 5,
        lastPlayedDate: "2026-07-09",
        captures: { akitan: 3 },
        sessions: 12,
        xp: 340,
        points: 20,
      },
      p2: {
        streak: 0,
        lastPlayedDate: null,
        captures: {},
        sessions: 0,
        xp: 0,
        points: 0,
      },
      p3: {
        streak: 0,
        lastPlayedDate: null,
        captures: {},
        sessions: 0,
        xp: 0,
        points: 0,
      },
      p4: {
        streak: 0,
        lastPlayedDate: null,
        captures: {},
        sessions: 0,
        xp: 0,
        points: 0,
      },
    },
    attempts: [
      {
        profileId: "p1",
        skillTag: "kanji-read-g3",
        correct: true,
        date: "2026-07-09",
      },
    ],
    settings: {
      pin: "1234",
      rewards: [{ name: "こうえん", cost: 30 }],
      rewardLog: [],
    },
  };
  const s = load(fakeStorage({ [STORAGE_KEY]: JSON.stringify(v4) }));
  assert.equal(s.version, 5);
  assert.equal(s.progress.p1.bestStreak, 5);
  assert.equal(s.progress.p1.title, null);
  assert.equal(s.progress.p1.xp, 340);
  assert.deepEqual(s.progress.p1.captures, { akitan: 3 });
  assert.equal(s.settings.pin, "1234");
  assert.equal(s.settings.rewards.length, 1);
  assert.equal(s.attempts.length, 1);
});

test("v2→v3→v4→v5 の段階移行で進捗保持", () => {
  const base = defaultState();
  const v2 = {
    version: 2,
    profiles: base.profiles,
    progress: {
      p1: {
        streak: 2,
        lastPlayedDate: "2026-07-08",
        monsters: ["akitan", "iburin"],
        sessions: 4,
      },
      p2: { streak: 0, lastPlayedDate: null, monsters: [], sessions: 0 },
      p3: { streak: 0, lastPlayedDate: null, monsters: [], sessions: 0 },
      p4: { streak: 0, lastPlayedDate: null, monsters: [], sessions: 0 },
    },
    attempts: [],
  };
  const s = load(fakeStorage({ [STORAGE_KEY]: JSON.stringify(v2) }));
  assert.equal(s.version, 5);
  assert.deepEqual(s.progress.p1.captures, { akitan: 1, iburin: 1 });
  assert.equal(s.progress.p1.bestStreak, 2);
  assert.equal(s.progress.p1.title, null);
});

test("v5移行は冪等(v5を読んでもそのまま)", () => {
  const v5 = defaultState();
  v5.progress.p1.bestStreak = 9;
  v5.progress.p1.title = "streak-7";
  const s = load(fakeStorage({ [STORAGE_KEY]: JSON.stringify(v5) }));
  assert.equal(s.progress.p1.bestStreak, 9);
  assert.equal(s.progress.p1.title, "streak-7");
});

test("recordSession が bestStreak を最高値で維持・更新", () => {
  const battle = {
    correctCount: 10,
    questions: new Array(10).fill({}),
    monster: { id: "akitan" },
    results: [],
  };
  // 旧bestStreakが大きい場合は維持
  const base = defaultState();
  base.progress.p1.bestStreak = 10;
  const s = recordSession(base, "p1", battle, "2026-07-10");
  assert.equal(s.progress.p1.streak, 1);
  assert.equal(s.progress.p1.bestStreak, 10);
  // streakが超えたら更新
  const s2 = recordSession(s, "p1", battle, "2026-07-11");
  s2.progress.p1.bestStreak = 1; // 低い値に細工して更新を確認
  const s3 = recordSession(s2, "p1", battle, "2026-07-12");
  assert.equal(s3.progress.p1.streak, 3);
  assert.equal(s3.progress.p1.bestStreak, 3);
});

test("setTitle: 装着・解除とも新しいstateを返す(非破壊)", () => {
  const base = defaultState();
  const s = setTitle(base, "p1", "streak-3");
  assert.equal(s.progress.p1.title, "streak-3");
  assert.equal(base.progress.p1.title, null);
  const s2 = setTitle(s, "p1", null);
  assert.equal(s2.progress.p1.title, null);
});
