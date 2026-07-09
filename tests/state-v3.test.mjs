import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultState, load } from "../js/state.js";

function mem() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, v),
  };
}

test("defaultState は settings.pin=null・version4・rewards", () => {
  const s = defaultState();
  assert.equal(s.version, 4);
  assert.deepEqual(s.settings, {
    pin: null,
    rewards: [],
    rewardLog: [],
  });
});

test("v2データはv4へ移行され、こどもの進捗が保持される(段階: v2→v3→v4)", () => {
  const st = mem();
  const v2 = {
    version: 2,
    profiles: [{ id: "p1", nickname: "1ねんせい", grade: 1, avatar: "🦊" }],
    progress: {
      p1: {
        streak: 7,
        lastPlayedDate: "2026-07-07",
        monsters: ["yukibo", "akitan"],
        sessions: 12,
      },
    },
    attempts: [
      {
        profileId: "p1",
        skillTag: "add-carry",
        correct: true,
        date: "2026-07-07",
      },
    ],
  };
  st.setItem("manabi-quest-v1", JSON.stringify(v2));
  const s = load(st);
  assert.equal(s.version, 4);
  assert.deepEqual(s.settings, { pin: null, rewards: [], rewardLog: [] });
  assert.equal(s.progress.p1.streak, 7);
  assert.deepEqual(s.progress.p1.captures, { yukibo: 1, akitan: 1 });
  assert.equal(s.attempts.length, 1);
});

test("v1(旧2プロフィール)や壊れた版はデフォルト(v4)へリセット", () => {
  const st = mem();
  st.setItem("manabi-quest-v1", JSON.stringify({ version: 1, foo: 1 }));
  assert.equal(load(st).version, 4);
  assert.equal(load(st).profiles.length, 4);
});
