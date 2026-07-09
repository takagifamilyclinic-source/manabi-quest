// アプリ状態の初期化・保存・セッション記録。storageは注入式(実機=localStorage)
import { updateStreak } from "./streak.js";
import { sessionGain, addCapture } from "./progress-calc.js";

export const STORAGE_KEY = "manabi-quest-v1";

// スキーマ版。学年別プロフィール(grade)化で v2 に更新。
// v1(旧 gradeBand・2プロフィール)のデータは load() で defaultState にリセットする
// (未公開のため実データ消失なし。将来の版上げ時は移行関数が必要=設計書TODO参照)。
// v3: settings.pin 追加(ロック・アンロック機構用)。
// v4: progress に xp/points/captures を追加(monsters削除)、settings に rewards/rewardLog追加。
// v5: progress に bestStreak(最高連続日数)/title(称号バッジID) を追加。
const SCHEMA_VERSION = 5;

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
      p1: {
        streak: 0,
        lastPlayedDate: null,
        captures: {},
        sessions: 0,
        xp: 0,
        points: 0,
        bestStreak: 0,
        title: null,
      },
      p2: {
        streak: 0,
        lastPlayedDate: null,
        captures: {},
        sessions: 0,
        xp: 0,
        points: 0,
        bestStreak: 0,
        title: null,
      },
      p3: {
        streak: 0,
        lastPlayedDate: null,
        captures: {},
        sessions: 0,
        xp: 0,
        points: 0,
        bestStreak: 0,
        title: null,
      },
      p4: {
        streak: 0,
        lastPlayedDate: null,
        captures: {},
        sessions: 0,
        xp: 0,
        points: 0,
        bestStreak: 0,
        title: null,
      },
    },
    attempts: [],
    settings: { pin: null, rewards: [], rewardLog: [] },
  };
}

function migrateV2toV3(s) {
  return { ...s, version: 3, settings: { pin: null } };
}

function migrateV3toV4(s) {
  const progress = {};
  for (const [pid, pr] of Object.entries(s.progress)) {
    const captures = {};
    for (const id of pr.monsters || []) captures[id] = 1;
    const { monsters, ...rest } = pr;
    progress[pid] = {
      ...rest,
      captures,
      xp: rest.xp ?? 0,
      points: rest.points ?? 0,
    };
  }
  return {
    ...s,
    version: 4,
    progress,
    settings: {
      ...(s.settings || { pin: null }),
      rewards: s.settings?.rewards ?? [],
      rewardLog: s.settings?.rewardLog ?? [],
    },
  };
}

function migrateV4toV5(s) {
  const progress = {};
  for (const [pid, pr] of Object.entries(s.progress)) {
    progress[pid] = {
      ...pr,
      bestStreak: pr.bestStreak ?? pr.streak ?? 0,
      title: pr.title ?? null,
    };
  }
  return { ...s, version: 5, progress };
}

export function load(storage) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    let s = JSON.parse(raw);
    if (!s || typeof s !== "object") return defaultState();
    if (s.version === SCHEMA_VERSION) return s;
    // v2 → v3 移行：settings 追加
    if (
      s.version === 2 &&
      Array.isArray(s.profiles) &&
      s.progress &&
      Array.isArray(s.attempts)
    ) {
      s = migrateV2toV3(s);
    }
    // v3 → v4 移行：monsters → captures、xp/points、rewards 追加
    if (
      s.version === 3 &&
      Array.isArray(s.profiles) &&
      s.progress &&
      Array.isArray(s.attempts)
    ) {
      s = migrateV3toV4(s);
    }
    // v4 → v5 移行：bestStreak / title 追加
    if (
      s.version === 4 &&
      Array.isArray(s.profiles) &&
      s.progress &&
      Array.isArray(s.attempts)
    ) {
      s = migrateV4toV5(s);
    }
    // v5 に到達したなら返す
    if (s.version === SCHEMA_VERSION) return s;
    // それ以外(v1・破損)は安全側でデフォルトにリセット
    return defaultState();
  } catch {
    return defaultState();
  }
}

export function save(storage, state) {
  storage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function recordSession(state, profileId, battle, todayStr) {
  const prog = state.progress[profileId];
  const gain = sessionGain(battle);
  const st = updateStreak(prog, todayStr);
  return {
    ...state,
    progress: {
      ...state.progress,
      [profileId]: {
        ...prog,
        ...st,
        bestStreak: Math.max(prog.bestStreak ?? 0, st.streak),
        captures: addCapture(prog.captures, battle.monster.id),
        sessions: prog.sessions + 1,
        xp: prog.xp + gain.xp,
        points: prog.points + gain.points,
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

// ごほうび交換：残高十分なら points を減算し rewardLog に記録して {ok:true,state}、
// 不足なら state を変えず {ok:false,state}。副作用なし(新しい state を返す)。
export function exchangeReward(state, profileId, reward, dateStr) {
  const prog = state.progress[profileId];
  if (prog.points < reward.cost) return { ok: false, state };
  return {
    ok: true,
    state: {
      ...state,
      progress: {
        ...state.progress,
        [profileId]: { ...prog, points: prog.points - reward.cost },
      },
      settings: {
        ...state.settings,
        rewardLog: [
          ...state.settings.rewardLog,
          { date: dateStr, profileId, name: reward.name, cost: reward.cost },
        ],
      },
    },
  };
}

// 称号の装着/解除。badgeId=null で外す。獲得済みかの検証は呼び出し側(UI)で行う。
export function setTitle(state, profileId, badgeId) {
  return {
    ...state,
    progress: {
      ...state.progress,
      [profileId]: { ...state.progress[profileId], title: badgeId },
    },
  };
}
