// アプリ状態の初期化・保存・セッション記録。storageは注入式(実機=localStorage)
import { updateStreak } from "./streak.js";

export const STORAGE_KEY = "manabi-quest-v1";

// スキーマ版。学年別プロフィール(grade)化で v2 に更新。
// v1(旧 gradeBand・2プロフィール)のデータは load() で defaultState にリセットする
// (未公開のため実データ消失なし。将来の版上げ時は移行関数が必要=設計書TODO参照)。
// v3: settings.pin 追加(ロック・アンロック機構用)。
const SCHEMA_VERSION = 3;

export function defaultState() {
  return {
    version: SCHEMA_VERSION,
    profiles: [
      { id: "p1", nickname: "1ねんせい", grade: 1, avatar: "🦊" },
      { id: "p2", nickname: "2ねんせい", grade: 2, avatar: "🐻" },
      { id: "p3", nickname: "3ねんせい", grade: 3, avatar: "🐰" },
      { id: "p4", nickname: "4ねんせい", grade: 4, avatar: "🐸" },
    ],
    progress: {
      p1: { streak: 0, lastPlayedDate: null, monsters: [], sessions: 0 },
      p2: { streak: 0, lastPlayedDate: null, monsters: [], sessions: 0 },
      p3: { streak: 0, lastPlayedDate: null, monsters: [], sessions: 0 },
      p4: { streak: 0, lastPlayedDate: null, monsters: [], sessions: 0 },
    },
    attempts: [],
    settings: { pin: null },
  };
}

export function load(storage) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const s = JSON.parse(raw);
    return s && s.version === SCHEMA_VERSION ? s : defaultState();
  } catch {
    return defaultState();
  }
}

export function save(storage, state) {
  storage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function recordSession(state, profileId, battle, todayStr) {
  const prog = state.progress[profileId];
  const monsters = prog.monsters.includes(battle.monster.id)
    ? prog.monsters
    : [...prog.monsters, battle.monster.id];
  return {
    ...state,
    progress: {
      ...state.progress,
      [profileId]: {
        ...prog,
        ...updateStreak(prog, todayStr),
        monsters,
        sessions: prog.sessions + 1,
      },
    },
    attempts: [
      ...state.attempts,
      ...battle.results.map((r) => ({
        profileId,
        skillTag: r.skillTag,
        correct: r.correct,
        date: todayStr,
      })),
    ],
  };
}
