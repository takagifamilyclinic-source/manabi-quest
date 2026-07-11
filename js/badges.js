// バッジの純粋計算。導出方式(保存しない)=過去のがんばりに自動でさかのぼって付与される。
import { levelFromXp, ownedCount, isEvolved } from "./progress-calc.js";

// skillTag のプレフィックスで教科を判定(sci-/soc- は次弾予約)
export function subjectOfTag(skillTag) {
  if (skillTag.startsWith("kanji-")) return "kanji";
  if (skillTag.startsWith("eng-")) return "english";
  if (skillTag.startsWith("sci-")) return "science";
  if (skillTag.startsWith("soc-")) return "social";
  return "math";
}

function correctCount(attempts, profileId, subject) {
  return attempts.filter(
    (a) =>
      a.profileId === profileId &&
      a.correct &&
      subjectOfTag(a.skillTag) === subject,
  ).length;
}

function evolvedCount(captures, monsterIds) {
  return monsterIds.filter((id) => isEvolved(captures, id)).length;
}

// 定義順=バッジ帳の表示順。cur(ctx) が現在値、target 以上で獲得。
export const BADGES = [
  {
    id: "streak-3",
    name: "れんぞく3日",
    emoji: "🔥",
    target: 3,
    unit: "日",
    cur: (c) => c.progress.bestStreak,
  },
  {
    id: "streak-7",
    name: "れんぞく7日",
    emoji: "⚡",
    target: 7,
    unit: "日",
    cur: (c) => c.progress.bestStreak,
  },
  {
    id: "streak-14",
    name: "れんぞく14日",
    emoji: "🌟",
    target: 14,
    unit: "日",
    cur: (c) => c.progress.bestStreak,
  },
  {
    id: "streak-30",
    name: "れんぞく30日",
    emoji: "👑",
    target: 30,
    unit: "日",
    cur: (c) => c.progress.bestStreak,
  },
  {
    id: "level-3",
    name: "Lv3とうたつ",
    emoji: "🌱",
    target: 3,
    unit: "Lv",
    cur: (c) => levelFromXp(c.progress.xp).level,
  },
  {
    id: "level-5",
    name: "Lv5とうたつ",
    emoji: "🌿",
    target: 5,
    unit: "Lv",
    cur: (c) => levelFromXp(c.progress.xp).level,
  },
  {
    id: "level-10",
    name: "Lv10とうたつ",
    emoji: "🌳",
    target: 10,
    unit: "Lv",
    cur: (c) => levelFromXp(c.progress.xp).level,
  },
  {
    id: "level-20",
    name: "Lv20とうたつ",
    emoji: "🏔️",
    target: 20,
    unit: "Lv",
    cur: (c) => levelFromXp(c.progress.xp).level,
  },
  {
    id: "zukan-5",
    name: "モンスター5たい",
    emoji: "🐣",
    target: 5,
    unit: "たい",
    cur: (c) => ownedCount(c.progress.captures),
  },
  {
    id: "zukan-10",
    name: "モンスター10たい",
    emoji: "🐥",
    target: 10,
    unit: "たい",
    cur: (c) => ownedCount(c.progress.captures),
  },
  {
    id: "zukan-15",
    name: "モンスター15たい",
    emoji: "🦅",
    target: 15,
    unit: "たい",
    cur: (c) => ownedCount(c.progress.captures),
  },
  {
    id: "zukan-20",
    name: "ずかんコンプ",
    emoji: "🎓",
    target: 20,
    unit: "たい",
    cur: (c) => ownedCount(c.progress.captures),
  },
  {
    id: "evolve-1",
    name: "はじめてのしんか",
    emoji: "✨",
    target: 1,
    unit: "たい",
    cur: (c) => evolvedCount(c.progress.captures, c.monsterIds),
  },
  {
    id: "evolve-20",
    name: "ぜんぶしんか",
    emoji: "💎",
    target: 20,
    unit: "たい",
    cur: (c) => evolvedCount(c.progress.captures, c.monsterIds),
  },
  {
    id: "battle-10",
    name: "バトル10かい",
    emoji: "🥉",
    target: 10,
    unit: "かい",
    cur: (c) => c.progress.sessions,
  },
  {
    id: "battle-50",
    name: "バトル50かい",
    emoji: "🥈",
    target: 50,
    unit: "かい",
    cur: (c) => c.progress.sessions,
  },
  {
    id: "battle-100",
    name: "バトル100かい",
    emoji: "🥇",
    target: 100,
    unit: "かい",
    cur: (c) => c.progress.sessions,
  },
  {
    id: "math-100",
    name: "さんすう100もん",
    emoji: "➗",
    target: 100,
    unit: "もん",
    cur: (c) => correctCount(c.attempts, c.profileId, "math"),
  },
  {
    id: "math-500",
    name: "さんすうはかせ",
    emoji: "🧮",
    target: 500,
    unit: "もん",
    cur: (c) => correctCount(c.attempts, c.profileId, "math"),
  },
  {
    id: "kanji-100",
    name: "かんじ100もん",
    emoji: "✏️",
    target: 100,
    unit: "もん",
    cur: (c) => correctCount(c.attempts, c.profileId, "kanji"),
  },
  {
    id: "kanji-500",
    name: "かんじはかせ",
    emoji: "📚",
    target: 500,
    unit: "もん",
    cur: (c) => correctCount(c.attempts, c.profileId, "kanji"),
  },
  {
    id: "sci-100",
    name: "りか100もん",
    emoji: "🔬",
    target: 100,
    unit: "もん",
    cur: (c) => correctCount(c.attempts, c.profileId, "science"),
  },
  {
    id: "sci-500",
    name: "りかはかせ",
    emoji: "🧪",
    target: 500,
    unit: "もん",
    cur: (c) => correctCount(c.attempts, c.profileId, "science"),
  },
  {
    id: "soc-100",
    name: "しゃかい100もん",
    emoji: "🗺️",
    target: 100,
    unit: "もん",
    cur: (c) => correctCount(c.attempts, c.profileId, "social"),
  },
  {
    id: "soc-500",
    name: "しゃかいはかせ",
    emoji: "🏛️",
    target: 500,
    unit: "もん",
    cur: (c) => correctCount(c.attempts, c.profileId, "social"),
  },
];

export function badgeContext(state, profileId, monsterIds) {
  return {
    progress: state.progress[profileId],
    attempts: state.attempts,
    profileId,
    monsterIds,
  };
}

export function badgeStatus(badge, ctx) {
  const raw = badge.cur(ctx) ?? 0;
  return {
    current: Math.min(raw, badge.target),
    target: badge.target,
    earned: raw >= badge.target,
  };
}

export function earnedBadges(ctx) {
  return new Set(
    BADGES.filter((b) => badgeStatus(b, ctx).earned).map((b) => b.id),
  );
}

export function newBadges(beforeSet, afterSet) {
  return BADGES.filter((b) => afterSet.has(b.id) && !beforeSet.has(b.id));
}
