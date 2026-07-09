# 第5弾(その1) 称号・バッジ 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 条件達成で自動獲得できるバッジ21種（バッジ帳で収集・未獲得は「あと○○」表示）と、獲得バッジから1つ選んでホームの名前の横に表示する称号機能を追加する。

**Architecture:** 導出方式 — バッジは保存せず `js/badges.js`（純関数）が現在の進捗から毎回計算する（さかのぼり付与が自動で効く）。保存は `bestStreak` と `title` の2フィールドのみ（schema v4→v5 の小さな移行）。新規獲得の演出はセッション記録前後のバッジ集合の差分で検出。

**Tech Stack:** buildless バニラJS（ESモジュール・依存ゼロ）・`node --test`・PWA（sw.js）・GitHub Pages。

**設計書:** `docs/specs/2026-07-10-phase5-badges-design.md`

## Global Constraints

- **課金ゼロ**：バッジアイコンは全て emoji（画像生成なし・アセット追加なし）。GitHub無料枠のみ。従量課金API不使用。
- **既存進捗を消さない**：schema v4→v5 の段階移行（v2→v3→v4→v5 チェーン維持・冪等）。図鑑・XP・ポイント・成績(attempts)・PIN・ごほうびは無傷。
- 依存追加禁止（package.json に dependencies を足さない）。
- `npm test` は各タスク完了時に全件グリーン（既存97件を壊さない）。
- **`sw.js` は ASSETS に `./js/badges.js` を追加し CACHE を v1.6.0 へ**（Task 4）。
- バッジ名・条件に事実データは含まれない（出典照合不要）。
- 作業ブランチ `feature/phase5-badges` で行い、最後に master へ `--no-ff` マージ（マージ・push・live確認はコントローラが最終全体レビュー後に実施）。

## 前提知識（実装者向け）

- 状態: `state.progress[pid] = { streak, lastPlayedDate, captures{id:回数}, sessions, xp, points }`（v4）。
  `state.attempts[] = { profileId, skillTag, correct, date }`（1問ごと・剪定なし）。
  `state.settings = { pin, rewards, rewardLog }`。SCHEMA_VERSION は `js/state.js:12`。
- 純計算: `js/progress-calc.js` が `levelFromXp(xp)` / `ownedCount(captures)` / `isEvolved(captures, id)`（捕獲3回で進化）を export。**再実装せず再利用する。**
- 画面: `js/app.js` が唯一のDOM依存層。`show("#screen-xxx")` で切替、各 `renderXxx()` が innerHTML を組む。screen要素は `index.html:22-29` に列挙。
- 漢字のskillTagは `kanji-` プレフィックス、算数はそれ以外（`mul-` 等複数）。教科の判定は「kanji-で始まるか否か」で行う。
- `npm test` = `node --test tests/`。

---

### Task 1: js/badges.js 純関数＋テスト（TDD）

**Files:**
- Create: `js/badges.js`
- Test: `tests/badges.test.mjs`

**Interfaces:**
- Consumes: `js/progress-calc.js` の `levelFromXp` / `ownedCount` / `isEvolved`。
- Produces（Task 2/3/4 が使う）:
  - `BADGES: Array<{id, name, emoji, target, unit, cur(ctx)}>`（定義順=表示順・21種）
  - `badgeContext(state, profileId, monsterIds): ctx`
  - `badgeStatus(badge, ctx): {current, target, earned}`（current は target で頭打ち）
  - `earnedBadges(ctx): Set<badgeId>`
  - `newBadges(beforeSet, afterSet): badge[]`（定義順）

- [ ] **Step 1: 作業ブランチ作成**

```bash
cd /d/Desktop-Archive/manabi-quest
git checkout -b feature/phase5-badges
```

- [ ] **Step 2: 失敗するテストを書く**

`tests/badges.test.mjs` を以下の内容で作成:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BADGES,
  badgeContext,
  badgeStatus,
  earnedBadges,
  newBadges,
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
    attempts.push({ profileId: "p1", skillTag: "kanji-read-g3", correct: true, date: "2026-07-10" });
  for (let i = 0; i < 99; i++)
    attempts.push({ profileId: "p1", skillTag: "mul-1", correct: true, date: "2026-07-10" });
  attempts.push({ profileId: "p2", skillTag: "mul-1", correct: true, date: "2026-07-10" });
  attempts.push({ profileId: "p1", skillTag: "mul-1", correct: false, date: "2026-07-10" });
  const e = earnedBadges(badgeContext(makeState({}, attempts), "p1", IDS));
  assert.ok(e.has("kanji-100"));
  assert.ok(!e.has("math-100")); // 算数正解は99問
});

test("badgeStatus: current は target で頭打ち", () => {
  const b = BADGES.find((x) => x.id === "battle-10");
  const st = badgeStatus(b, badgeContext(makeState({ sessions: 999 }), "p1", IDS));
  assert.deepEqual(st, { current: 10, target: 10, earned: true });
});

test("badgeStatus: 未獲得は現在値と目標を返す(あと表示用)", () => {
  const b = BADGES.find((x) => x.id === "battle-50");
  const st = badgeStatus(b, badgeContext(makeState({ sessions: 38 }), "p1", IDS));
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
```

- [ ] **Step 3: テストが失敗することを確認**

```bash
cd /d/Desktop-Archive/manabi-quest && node --test tests/badges.test.mjs
```
Expected: FAIL（`js/badges.js` が無い）。

- [ ] **Step 4: js/badges.js を実装**

```js
// バッジの純粋計算。導出方式(保存しない)=過去のがんばりに自動でさかのぼって付与される。
import { levelFromXp, ownedCount, isEvolved } from "./progress-calc.js";

function correctCount(attempts, profileId, isKanji) {
  return attempts.filter(
    (a) =>
      a.profileId === profileId &&
      a.correct &&
      a.skillTag.startsWith("kanji-") === isKanji,
  ).length;
}

function evolvedCount(captures, monsterIds) {
  return monsterIds.filter((id) => isEvolved(captures, id)).length;
}

// 定義順=バッジ帳の表示順。cur(ctx) が現在値、target 以上で獲得。
export const BADGES = [
  { id: "streak-3", name: "れんぞく3日", emoji: "🔥", target: 3, unit: "日", cur: (c) => c.progress.bestStreak },
  { id: "streak-7", name: "れんぞく7日", emoji: "⚡", target: 7, unit: "日", cur: (c) => c.progress.bestStreak },
  { id: "streak-14", name: "れんぞく14日", emoji: "🌟", target: 14, unit: "日", cur: (c) => c.progress.bestStreak },
  { id: "streak-30", name: "れんぞく30日", emoji: "👑", target: 30, unit: "日", cur: (c) => c.progress.bestStreak },
  { id: "level-3", name: "Lv3とうたつ", emoji: "🌱", target: 3, unit: "Lv", cur: (c) => levelFromXp(c.progress.xp).level },
  { id: "level-5", name: "Lv5とうたつ", emoji: "🌿", target: 5, unit: "Lv", cur: (c) => levelFromXp(c.progress.xp).level },
  { id: "level-10", name: "Lv10とうたつ", emoji: "🌳", target: 10, unit: "Lv", cur: (c) => levelFromXp(c.progress.xp).level },
  { id: "level-20", name: "Lv20とうたつ", emoji: "🏔️", target: 20, unit: "Lv", cur: (c) => levelFromXp(c.progress.xp).level },
  { id: "zukan-5", name: "モンスター5たい", emoji: "🐣", target: 5, unit: "たい", cur: (c) => ownedCount(c.progress.captures) },
  { id: "zukan-10", name: "モンスター10たい", emoji: "🐥", target: 10, unit: "たい", cur: (c) => ownedCount(c.progress.captures) },
  { id: "zukan-15", name: "モンスター15たい", emoji: "🦅", target: 15, unit: "たい", cur: (c) => ownedCount(c.progress.captures) },
  { id: "zukan-20", name: "ずかんコンプ", emoji: "🎓", target: 20, unit: "たい", cur: (c) => ownedCount(c.progress.captures) },
  { id: "evolve-1", name: "はじめてのしんか", emoji: "✨", target: 1, unit: "たい", cur: (c) => evolvedCount(c.progress.captures, c.monsterIds) },
  { id: "evolve-20", name: "ぜんぶしんか", emoji: "💎", target: 20, unit: "たい", cur: (c) => evolvedCount(c.progress.captures, c.monsterIds) },
  { id: "battle-10", name: "バトル10かい", emoji: "🥉", target: 10, unit: "かい", cur: (c) => c.progress.sessions },
  { id: "battle-50", name: "バトル50かい", emoji: "🥈", target: 50, unit: "かい", cur: (c) => c.progress.sessions },
  { id: "battle-100", name: "バトル100かい", emoji: "🥇", target: 100, unit: "かい", cur: (c) => c.progress.sessions },
  { id: "math-100", name: "さんすう100もん", emoji: "➗", target: 100, unit: "もん", cur: (c) => correctCount(c.attempts, c.profileId, false) },
  { id: "math-500", name: "さんすうはかせ", emoji: "🧮", target: 500, unit: "もん", cur: (c) => correctCount(c.attempts, c.profileId, false) },
  { id: "kanji-100", name: "かんじ100もん", emoji: "✏️", target: 100, unit: "もん", cur: (c) => correctCount(c.attempts, c.profileId, true) },
  { id: "kanji-500", name: "かんじはかせ", emoji: "📚", target: 500, unit: "もん", cur: (c) => correctCount(c.attempts, c.profileId, true) },
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
```

- [ ] **Step 5: テスト通過と全体グリーンを確認**

```bash
cd /d/Desktop-Archive/manabi-quest && node --test tests/badges.test.mjs && npm test
```
Expected: すべてPASS。

- [ ] **Step 6: コミット**

```bash
cd /d/Desktop-Archive/manabi-quest
git add js/badges.js tests/badges.test.mjs
git commit -m "feat: バッジ判定の純関数(21種・導出方式・あと表示/差分検出付き)"
```

---

### Task 2: state v5（bestStreak/title・移行・recordSession更新・setTitle）＋テスト（TDD）

**Files:**
- Modify: `js/state.js`（SCHEMA_VERSION=5・defaultState・migrateV4toV5・load・recordSession・setTitle新設）
- Test: `tests/state-v5.test.mjs`（新規）

**Interfaces:**
- Consumes: 既存 `updateStreak(prog, todayStr)`（`js/streak.js`・`{streak, lastPlayedDate}` を返す）。
- Produces（Task 3 が使う）:
  - `progress[pid].bestStreak: number` / `progress[pid].title: string|null`
  - `setTitle(state, profileId, badgeId|null): state`（純関数・新しいstateを返す。獲得済み検証は呼び出し側UIの責務）
  - `recordSession` が `bestStreak = max(旧bestStreak, 新streak)` を維持

- [ ] **Step 1: 失敗するテストを書く**

`tests/state-v5.test.mjs` を以下の内容で作成:

```js
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
      p1: { streak: 5, lastPlayedDate: "2026-07-09", captures: { akitan: 3 }, sessions: 12, xp: 340, points: 20 },
      p2: { streak: 0, lastPlayedDate: null, captures: {}, sessions: 0, xp: 0, points: 0 },
      p3: { streak: 0, lastPlayedDate: null, captures: {}, sessions: 0, xp: 0, points: 0 },
      p4: { streak: 0, lastPlayedDate: null, captures: {}, sessions: 0, xp: 0, points: 0 },
    },
    attempts: [{ profileId: "p1", skillTag: "kanji-read-g3", correct: true, date: "2026-07-09" }],
    settings: { pin: "1234", rewards: [{ name: "こうえん", cost: 30 }], rewardLog: [] },
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
      p1: { streak: 2, lastPlayedDate: "2026-07-08", monsters: ["akitan", "iburin"], sessions: 4 },
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
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
cd /d/Desktop-Archive/manabi-quest && node --test tests/state-v5.test.mjs
```
Expected: FAIL（version が 4・setTitle 未定義）。

- [ ] **Step 3: js/state.js を更新**

変更点（既存コードの該当箇所を置き換え/追記）:

1. `js/state.js:11-12` のコメントと版数:
```js
// v4: progress に xp/points/captures を追加(monsters削除)、settings に rewards/rewardLog追加。
// v5: progress に bestStreak(最高連続日数)/title(称号バッジID) を追加。
const SCHEMA_VERSION = 5;
```

2. `defaultState()` の p1〜p4 それぞれに `bestStreak: 0,` と `title: null,` を追加（`points: 0,` の直後）。

3. `migrateV3toV4` の直後に追加:
```js
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
```

4. `load()` の v3→v4 ブロックの直後・「v4 に到達したなら返す」コメント行の前に追加（既存コメントは「v5 に到達したなら返す」に直す）:
```js
    // v4 → v5 移行：bestStreak / title 追加
    if (
      s.version === 4 &&
      Array.isArray(s.profiles) &&
      s.progress &&
      Array.isArray(s.attempts)
    ) {
      s = migrateV4toV5(s);
    }
```

5. `recordSession` を bestStreak 更新版に置き換え:
```js
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
```

6. ファイル末尾に追加:
```js
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
```

- [ ] **Step 4: テスト通過と全体グリーンを確認**

```bash
cd /d/Desktop-Archive/manabi-quest && node --test tests/state-v5.test.mjs && npm test
```
Expected: すべてPASS（既存のstate系テストがdefaultStateのフィールド増で落ちたら、期待値にbestStreak/titleを追加する方向で修正。挙動の緩和はしない）。

- [ ] **Step 5: コミット**

```bash
cd /d/Desktop-Archive/manabi-quest
git add js/state.js tests/state-v5.test.mjs
git commit -m "feat: state v5(bestStreak/title・v4→v5移行・setTitle・recordSessionでbestStreak維持)"
```

---

### Task 3: UI — バッジ帳・称号表示・獲得演出（ブラウザ検証）

**Files:**
- Modify: `index.html`（screen-badges 追加）
- Modify: `js/app.js`（import・renderHome・renderBadges新設・finishBattle）
- Modify: `css/style.css`（バッジ帳・称号チップ・獲得演出）

**Interfaces:**
- Consumes: Task 1 の `BADGES` / `badgeContext` / `badgeStatus` / `earnedBadges` / `newBadges`、Task 2 の `setTitle` / `progress[pid].title`。
- Produces: 画面遷移 ホーム→「🏅 バッジちょう」→バッジ帳（獲得済みタップで称号装着/解除）。バトル結果に「バッジかくとく!」。

- [ ] **Step 1: index.html に screen を追加**

`index.html` の `<section id="screen-zukan" ...>` の直後に:
```html
      <section id="screen-badges" class="screen hidden"></section>
```

- [ ] **Step 2: js/app.js を更新**

1. import に追加（既存の `./state.js` import に `setTitle` を足し、badges.js を新規 import）:
```js
import {
  load,
  save,
  recordSession,
  exchangeReward,
  setTitle,
  STORAGE_KEY,
} from "./state.js";
import {
  BADGES,
  badgeContext,
  badgeStatus,
  earnedBadges,
  newBadges,
} from "./badges.js";
```
2. `MONSTERS` import の直後あたりに:
```js
const MONSTER_IDS = MONSTERS.map((m) => m.id);
```
3. `renderHome()` を置き換え（称号チップ＋バッジちょうボタン追加。他は既存のまま）:
```js
function renderHome() {
  const prog = progress();
  const lv = levelFromXp(prog.xp);
  const titleBadge = BADGES.find((b) => b.id === prog.title);
  $("#screen-home").innerHTML = `
    <h1>${profile().avatar} ${profile().nickname}${
      titleBadge
        ? ` <span class="title-chip">${titleBadge.emoji} ${titleBadge.name}</span>`
        : ""
    }</h1>
    <div class="card streak">🔥 れんぞく <b>${prog.streak}</b> 日 / ずかん <b>${ownedCount(prog.captures)}</b>/${MONSTERS.length}</div>
    <div class="card streak">⭐ Lv <b>${lv.level}</b>
      <div class="xpbar"><div style="width:${(lv.inLevel / lv.need) * 100}%"></div></div>
      🪙 ポイント <b>${prog.points}</b></div>
    <button id="btn-battle">⚔️ バトルに でかける</button>
    <button id="btn-zukan" class="secondary">📖 モンスターずかん</button>
    <button id="btn-badges" class="secondary">🏅 バッジちょう</button>
    <button id="btn-reward" class="secondary">🎁 ごほうび</button>
    <button id="btn-back" class="secondary">👤 プレイヤーをかえる</button>
  `;
  $("#btn-battle").addEventListener("click", renderSubject);
  $("#btn-zukan").addEventListener("click", renderZukan);
  $("#btn-badges").addEventListener("click", renderBadges);
  $("#btn-reward").addEventListener("click", renderReward);
  $("#btn-back").addEventListener("click", renderProfile);
  show("#screen-home");
}
```
4. `renderZukan` の前に `renderBadges` を新設:
```js
function renderBadges() {
  const ctx = badgeContext(app.state, app.profileId, MONSTER_IDS);
  const earned = earnedBadges(ctx);
  const title = progress().title;
  $("#screen-badges").innerHTML = `
    <h1>🏅 バッジちょう (${earned.size}/${BADGES.length})</h1>
    <div class="badge-grid">
      ${BADGES.map((b) => {
        const st = badgeStatus(b, ctx);
        if (!st.earned)
          return `<div class="badge-cell locked">
            <div class="badge-icon">🔒</div>
            <div class="badge-name">${b.name}</div>
            <div class="badge-left">あと${st.target - st.current}${b.unit}</div>
          </div>`;
        const active = title === b.id;
        return `<div class="badge-cell earned ${active ? "active" : ""}" data-id="${b.id}">
          <div class="badge-icon">${b.emoji}</div>
          <div class="badge-name">${b.name}</div>
          <div class="badge-left">${active ? "そうびちゅう!" : "タップで しょうごうに"}</div>
        </div>`;
      }).join("")}
    </div>
    <button id="badge-back" class="secondary">もどる</button>
  `;
  document.querySelectorAll(".badge-cell.earned").forEach((c) =>
    c.addEventListener("click", () => {
      const id = c.dataset.id;
      app.state = setTitle(
        app.state,
        app.profileId,
        progress().title === id ? null : id,
      );
      save(localStorage, app.state);
      renderBadges();
    }),
  );
  $("#badge-back").addEventListener("click", renderHome);
  show("#screen-badges");
}
```
5. `finishBattle()` に獲得差分を追加。冒頭の `const beforeEvolved = ...` 行の直後に:
```js
  const beforeBadges = earnedBadges(
    badgeContext(app.state, app.profileId, MONSTER_IDS),
  );
```
`save(localStorage, app.state);` の直後に:
```js
  const gotBadges = newBadges(
    beforeBadges,
    earnedBadges(badgeContext(app.state, app.profileId, MONSTER_IDS)),
  );
```
結果HTMLの `せいかい ...` カードの直前に挿入:
```js
    ${
      gotBadges.length
        ? `<div class="card badge-get">🏅 バッジかくとく!<br>${gotBadges
            .map((b) => `<span class="badge-chip">${b.emoji} ${b.name}</span>`)
            .join(" ")}</div>`
        : ""
    }
```

- [ ] **Step 3: css/style.css にスタイル追加（末尾）**

```css
/* ===== バッジ(第5弾) ===== */
.title-chip {
  display: inline-block;
  font-size: 0.5em;
  background: #ffe9a8;
  border-radius: 999px;
  padding: 2px 10px;
  vertical-align: middle;
}
.badge-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin: 12px 0;
}
.badge-cell {
  background: #fff;
  border-radius: 14px;
  padding: 10px 6px;
  text-align: center;
  border: 2px solid transparent;
}
.badge-cell.locked {
  opacity: 0.55;
  filter: grayscale(1);
}
.badge-cell.active {
  border-color: #f5a623;
  box-shadow: 0 0 8px rgba(245, 166, 35, 0.6);
}
.badge-icon {
  font-size: 34px;
}
.badge-name {
  font-size: 12px;
  font-weight: bold;
  margin-top: 4px;
}
.badge-left {
  font-size: 11px;
  color: #777;
  margin-top: 2px;
}
.badge-get {
  animation: badgeglow 1s ease-in-out infinite alternate;
}
.badge-chip {
  display: inline-block;
  background: #fff3c4;
  border-radius: 999px;
  padding: 2px 10px;
  margin: 2px;
  font-weight: bold;
}
@keyframes badgeglow {
  from {
    box-shadow: 0 0 4px rgba(245, 166, 35, 0.4);
  }
  to {
    box-shadow: 0 0 16px rgba(245, 166, 35, 0.9);
  }
}
```
（既存の配色・角丸の流儀と大きく違う場合は既存に合わせて微調整してよい。）

- [ ] **Step 4: 全体テスト確認**

```bash
cd /d/Desktop-Archive/manabi-quest && npm test
```
Expected: 全件PASS（このタスクはUIのみでロジック変更なし）。

- [ ] **Step 5: ブラウザ検証（必須）**

`python -m http.server 8123`（リポジトリ直下）で配信し、chrome-devtools MCP（無ければ playwright MCP）で以下を確認:
1. プロフィール選択→ホームに「🏅 バッジちょう」ボタンがある。
2. バッジちょう: 初期状態は 0/21・全セルがロック（🔒とあと表示）。
3. `evaluate_script` で localStorage に進捗を注入して検証（例）:
```js
(() => {
  const raw = JSON.parse(localStorage.getItem("manabi-quest-v1"));
  raw.progress.p1.bestStreak = 7;
  raw.progress.p1.sessions = 12;
  raw.progress.p1.xp = 350;
  localStorage.setItem("manabi-quest-v1", JSON.stringify(raw));
  location.reload();
})()
```
→ バッジちょうで streak-3/streak-7/battle-10/level-3 が獲得表示（4/21）。
4. 獲得済みバッジをタップ→「そうびちゅう!」になり、ホームの名前横に称号チップが出る。もう一度タップで外れる。
5. sessions を 9 に細工してから1バトル完走（かんじ=全問4択で操作しやすい）→ 結果画面に「🏅 バッジかくとく! 🥉 バトル10かい」が出る。
6. localStorage を消して新規状態→v5で起動し従来画面が正常（回帰確認）。
検証後サーバ停止。スクリーンショット等の証跡をレポートに記録。

- [ ] **Step 6: コミット**

```bash
cd /d/Desktop-Archive/manabi-quest
git add index.html js/app.js css/style.css
git commit -m "feat: バッジちょう画面・称号えらび・バトル結果のバッジかくとく演出"
```

---

### Task 4: sw v1.6.0・README・ヘッドレス検証（マージ・公開はコントローラ）

**Files:**
- Modify: `sw.js`（ASSETS に badges.js 追加＋CACHE v1.6.0）
- Modify: `README.md`（第5弾の記載）
- Create→Delete: `_verify.html`

**Interfaces:**
- Consumes: Task 1〜3 の全成果。

- [ ] **Step 1: sw.js 更新**

`sw.js:2` を `const CACHE = "manabi-quest-v1.6.0";` に。ASSETS の `"./js/progress-calc.js",` の直後に `"./js/badges.js",` を追加。**他は変更しない。**

- [ ] **Step 2: README に第5弾を追記**

既存のリリース節の並びに合わせて「称号・バッジ（21種・emoji・導出方式・称号えらび・schema v5）」の節を追加。ロードマップから称号・バッジを消す（あれば）。

- [ ] **Step 3: ヘッドレス検証**

リポジトリ直下に `_verify.html`:
```html
<!doctype html><meta charset="utf-8"><div id="out"></div>
<script type="module">
  import { BADGES, badgeContext, earnedBadges } from "./js/badges.js";
  import { defaultState } from "./js/state.js";
  import { MONSTERS } from "./data/monsters.js";
  const ids = MONSTERS.map((m) => m.id);
  const s = defaultState();
  s.progress.p1.bestStreak = 7;
  s.progress.p1.sessions = 10;
  const e = earnedBadges(badgeContext(s, "p1", ids));
  document.getElementById("out").textContent =
    `badges=${BADGES.length} version=${s.version} earned=${[...e].sort().join(",")}`;
</script>
```
```bash
cd /d/Desktop-Archive/manabi-quest && python -m http.server 8124 &
sleep 2
"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --dump-dom "http://127.0.0.1:8124/_verify.html" | grep -A2 'id="out"'
kill %1
rm _verify.html
```
Expected: `badges=21 version=5 earned=battle-10,streak-3,streak-7`。

- [ ] **Step 4: 全体テスト→コミット**

```bash
cd /d/Desktop-Archive/manabi-quest && npm test
git add sw.js README.md
git commit -m "chore: sw v1.6.0(badges.js追加)・README第5弾(称号・バッジ)"
```
（マージ・push・live確認は最終全体レビュー後にコントローラが実施。）

---

### Task 5: ドキュメント・メモリ更新（クローズ・公開後）

**Files:**
- Modify: `docs/進捗.md`
- Modify: メモリ `C:\Users\User\.claude\projects\C--Users-User-iCloudDrive-iCloud-md-obsidian----\memory\manabi-quest-app.md`

- [ ] **Step 1: docs/進捗.md に第5弾(その1)完了を追記**（リリース状況・後続候補の整理・masterコミットID・テスト件数・sw v1.6.0）
- [ ] **Step 2: メモリ更新**（第5弾完了の要点・schema v5・導出方式・残候補）
- [ ] **Step 3: コミット＆push**

```bash
cd /d/Desktop-Archive/manabi-quest
git add docs/進捗.md
git commit -m "docs: 第5弾(その1)完了を進捗ログに反映"
git push origin master
```
