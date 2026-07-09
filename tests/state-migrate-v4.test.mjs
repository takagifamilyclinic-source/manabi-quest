import { test } from "node:test";
import assert from "node:assert/strict";
import { load } from "../js/state.js";

function mem() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, v),
  };
}

test("v3→v4: monsters→captures・xp/points・rewards、進捗保持", () => {
  const st = mem();
  const v3 = {
    version: 3,
    profiles: [{ id: "p1", nickname: "1ねんせい", grade: 1, avatar: "🦊" }],
    progress: {
      p1: {
        streak: 5,
        lastPlayedDate: "2026-07-07",
        monsters: ["yukibo", "akitan"],
        sessions: 9,
      },
    },
    attempts: [{ profileId: "p1", skillTag: "kuku", correct: true, date: "x" }],
    settings: { pin: "1234" },
  };
  st.setItem("manabi-quest-v1", JSON.stringify(v3));
  const s = load(st);
  assert.equal(s.version, 4);
  assert.equal(s.progress.p1.streak, 5);
  assert.equal(s.progress.p1.sessions, 9);
  assert.deepEqual(s.progress.p1.captures, { yukibo: 1, akitan: 1 });
  assert.equal(s.progress.p1.monsters, undefined);
  assert.equal(s.progress.p1.xp, 0);
  assert.equal(s.progress.p1.points, 0);
  assert.equal(s.settings.pin, "1234");
  assert.deepEqual(s.settings.rewards, []);
});

test("v2→v4も一気通貫", () => {
  const st = mem();
  const v2 = {
    version: 2,
    profiles: [{ id: "p1", nickname: "1ねんせい", grade: 1, avatar: "🦊" }],
    progress: {
      p1: {
        streak: 2,
        lastPlayedDate: "x",
        monsters: ["yukibo"],
        sessions: 1,
      },
    },
    attempts: [],
  };
  st.setItem("manabi-quest-v1", JSON.stringify(v2));
  const s = load(st);
  assert.equal(s.version, 4);
  assert.deepEqual(s.progress.p1.captures, { yukibo: 1 });
  assert.equal(s.progress.p1.xp, 0);
  assert.deepEqual(s.settings.rewards, []);
});

test("v4は冪等", () => {
  const st = mem();
  const v4 = {
    version: 4,
    profiles: [{ id: "p1", nickname: "x", grade: 1, avatar: "🦊" }],
    progress: {
      p1: {
        streak: 1,
        lastPlayedDate: "x",
        captures: { yukibo: 3 },
        sessions: 4,
        xp: 130,
        points: 13,
      },
    },
    attempts: [],
    settings: {
      pin: null,
      rewards: [{ id: "r1", name: "アイス", cost: 50 }],
      rewardLog: [],
    },
  };
  st.setItem("manabi-quest-v1", JSON.stringify(v4));
  const s = load(st);
  assert.equal(s.progress.p1.captures.yukibo, 3);
  assert.equal(s.progress.p1.xp, 130);
  assert.deepEqual(s.settings.rewards, [
    { id: "r1", name: "アイス", cost: 50 },
  ]);
});

test("v1・破損はデフォルト(v4)へ", () => {
  const st = mem();
  st.setItem("manabi-quest-v1", JSON.stringify({ version: 1 }));
  assert.equal(load(st).version, 4);
  assert.equal(load(st).profiles.length, 4);
});
