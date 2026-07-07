import { test } from "node:test";
import assert from "node:assert/strict";
import {
  STORAGE_KEY,
  defaultState,
  load,
  save,
  recordSession,
} from "../js/state.js";

function memStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, v),
  };
}

test("defaultState は1〜4年生の4プロフィールを持つ", () => {
  const s = defaultState();
  assert.equal(s.profiles.length, 4);
  assert.deepEqual(
    s.profiles.map((p) => p.grade),
    [1, 2, 3, 4],
  );
  assert.deepEqual(
    s.profiles.map((p) => p.id),
    ["p1", "p2", "p3", "p4"],
  );
  // 各プロフィールに対応する進捗がある
  for (const p of s.profiles) {
    assert.deepEqual(s.progress[p.id].monsters, []);
  }
});

test("load: 空ストレージなら defaultState", () => {
  const s = load(memStorage());
  assert.equal(s.version, 2);
});

test("load: 旧v1データ(gradeBand・2人)は安全にv2デフォルトへリセットされる", () => {
  const st = memStorage();
  const oldV1 = {
    version: 1,
    profiles: [
      { id: "p1", nickname: "ゆうしゃ1", gradeBand: "low", avatar: "🦊" },
    ],
    progress: {
      p1: {
        streak: 9,
        lastPlayedDate: "2026-07-06",
        monsters: ["yukibo"],
        sessions: 3,
      },
    },
    attempts: [],
  };
  st.setItem("manabi-quest-v1", JSON.stringify(oldV1));
  const s = load(st);
  // 旧スキーマは弾き、4学年のデフォルトになる(grade未定義でのクラッシュを防ぐ)
  assert.equal(s.version, 2);
  assert.equal(s.profiles.length, 4);
  assert.deepEqual(
    s.profiles.map((p) => p.grade),
    [1, 2, 3, 4],
  );
});

test("save して load すると同じ状態が返る", () => {
  const st = memStorage();
  const s = defaultState();
  s.progress.p1.streak = 5;
  save(st, s);
  assert.equal(load(st).progress.p1.streak, 5);
});

test("load: 壊れたJSONでも defaultState に戻る", () => {
  const st = memStorage();
  st.setItem(STORAGE_KEY, "{{{broken");
  assert.equal(load(st).version, 2);
});

test("recordSession: モンスター獲得・streak更新・attempts追記", () => {
  const battle = {
    monster: { id: "yukibo" },
    results: [
      { skillTag: "kuku", correct: true },
      { skillTag: "kuku", correct: false },
    ],
    finished: true,
  };
  const s1 = recordSession(defaultState(), "p1", battle, "2026-07-07");
  assert.deepEqual(s1.progress.p1.monsters, ["yukibo"]);
  assert.equal(s1.progress.p1.streak, 1);
  assert.equal(s1.progress.p1.lastPlayedDate, "2026-07-07");
  assert.equal(s1.progress.p1.sessions, 1);
  assert.equal(s1.attempts.length, 2);
  assert.deepEqual(s1.attempts[0], {
    profileId: "p1",
    skillTag: "kuku",
    correct: true,
    date: "2026-07-07",
  });
  const s2 = recordSession(s1, "p1", battle, "2026-07-07");
  assert.deepEqual(s2.progress.p1.monsters, ["yukibo"]);
  assert.equal(s2.progress.p1.sessions, 2);
});
