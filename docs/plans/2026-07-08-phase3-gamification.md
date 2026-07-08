# まなびクエスト 第3弾(その1) Implementation Plan — やる気の仕組み

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 既存アプリに XP/レベル・ごほうびポイント帳(親が一覧・親が交換)・モンスター進化(同一3回捕獲で1段階)を追加し、schema v4 に移行して既存進捗を保持する。

**Architecture:** 計算は純粋モジュール `progress-calc.js` に集約(レベル・獲得XP/ポイント・捕獲/進化)。state.js の recordSession/defaultState/load(移行) を拡張。app.js に表示・親ごほうび管理・進化演出を追加。進化画像は Pollinations で生成。

**Tech Stack:** Vanilla JS(ESモジュール)/ PWA / node:test / 依存ゼロ / Pollinations(無料)

## Global Constraints
- 課金ゼロ・npm依存ゼロ・外部CDN無し・node標準のみ・ESモジュール
- こどものデータは端末内(localStorage)のみ・外部送信しない
- こども向け(大きい文字・タッチボタン最小56px・誤答ペナルティなし)
- IP配慮(オリジナルモンスターのみ)
- GitHub Pagesサブパス配信で壊れない相対パス(`./` `../`)
- 画像生成前にプロンプト一覧を提示して承認を得る(保管庫ルール・スキップ不可)
- **公開中: スキーマ変更は移行を実装し既存進捗を保持**
- 数値(verbatim): 正解1問=10XP・セッションクリア=+50XP / 正解1問=1ポイント・セッション=+5ポイント / レベル n→n+1 に n×100XP / 進化=同一モンスター3回捕獲
- 作業ディレクトリ `D:\Desktop-Archive\manabi-quest`。コミット末尾に改行して `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`

## File Structure
```
js/progress-calc.js   # 純粋: levelFromXp / sessionGain / addCapture / isEvolved / ownedCount
js/state.js           # defaultState(v4)・recordSession(xp/points/captures)・load(v2→v3→v4移行)・exchangeReward
js/app.js             # ホームLv/XP/ポイント・結果の獲得表示・図鑑の進化表示・しんか演出・親ごほうび管理
data/monsters.js      # evolveName/evolveImg 追加
assets/evo-<id>.png   # 進化後モンスター20体
sw.js / manifest.json # 進化画像・progress-calc.js 追加・CACHE更新
tests/*.test.mjs
```

---

### Task 1: progress-calc.js(レベル・獲得・捕獲・進化の純粋計算)

**Files:**
- Create: `js/progress-calc.js`, `tests/progress-calc.test.mjs`

**Interfaces:**
- Produces:
  - `levelFromXp(xp) -> {level, inLevel, need}`: 累積XP `cumXp(L)=100*(L-1)*L/2`。level は `cumXp(level)<=xp<cumXp(level+1)` を満たす最大。`inLevel = xp - cumXp(level)`、`need = level*100`(次レベルまでの総量)。Lv1=0XP、Lv2=100、Lv3=300、Lv4=600。
  - `sessionGain(battle) -> {xp, points}`: `xp = battle.correctCount*10 + 50`、`points = battle.correctCount*1 + 5`。
  - `addCapture(captures, id) -> newCaptures`: `{...captures, [id]:(captures[id]||0)+1}`(元を破壊しない)。
  - `isEvolved(captures, id, threshold=3) -> boolean`: `(captures[id]||0) >= threshold`。
  - `ownedCount(captures) -> number`: `Object.keys(captures).length`。

- [ ] **Step 1: 失敗テスト** — `tests/progress-calc.test.mjs`
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { levelFromXp, sessionGain, addCapture, isEvolved, ownedCount } from "../js/progress-calc.js";

test("levelFromXp 境界", () => {
  assert.deepEqual(levelFromXp(0), { level: 1, inLevel: 0, need: 100 });
  assert.deepEqual(levelFromXp(99), { level: 1, inLevel: 99, need: 100 });
  assert.deepEqual(levelFromXp(100), { level: 2, inLevel: 0, need: 200 });
  assert.deepEqual(levelFromXp(299), { level: 2, inLevel: 199, need: 200 });
  assert.deepEqual(levelFromXp(300), { level: 3, inLevel: 0, need: 300 });
});

test("levelFromXp 単調(XPが増えるとレベルは下がらない)", () => {
  let prev = 1;
  for (let xp = 0; xp <= 5000; xp += 37) {
    const l = levelFromXp(xp).level;
    assert.ok(l >= prev, `xp=${xp} level=${l}`);
    prev = l;
  }
});

test("sessionGain: 正解数からXP/ポイント", () => {
  assert.deepEqual(sessionGain({ correctCount: 10 }), { xp: 150, points: 15 });
  assert.deepEqual(sessionGain({ correctCount: 0 }), { xp: 50, points: 5 });
});

test("addCapture は元を壊さず回数を増やす", () => {
  const c0 = { yukibo: 2 };
  const c1 = addCapture(c0, "yukibo");
  assert.equal(c1.yukibo, 3);
  assert.equal(c0.yukibo, 2);
  assert.equal(addCapture({}, "akitan").akitan, 1);
});

test("isEvolved は3回以上で真", () => {
  assert.equal(isEvolved({ yukibo: 2 }, "yukibo"), false);
  assert.equal(isEvolved({ yukibo: 3 }, "yukibo"), true);
  assert.equal(isEvolved({}, "yukibo"), false);
});

test("ownedCount は種類数", () => {
  assert.equal(ownedCount({ a: 1, b: 5 }), 2);
  assert.equal(ownedCount({}), 0);
});
```

- [ ] **Step 2: 失敗確認** — Run: `cd /d/Desktop-Archive/manabi-quest && npm test` / Expected: FAIL(module無し)
- [ ] **Step 3: 実装** — `js/progress-calc.js`
```js
// やる気の仕組みの純粋計算(レベル・獲得XP/ポイント・捕獲/進化)。副作用なし。
const EVOLVE_AT = 3;

// 累積XP: レベルLに到達するのに必要な総XP = 100*(L-1)*L/2
function cumXp(level) {
  return (100 * (level - 1) * level) / 2;
}

export function levelFromXp(xp) {
  let level = 1;
  while (cumXp(level + 1) <= xp) level++;
  return { level, inLevel: xp - cumXp(level), need: level * 100 };
}

export function sessionGain(battle) {
  const c = battle.correctCount;
  return { xp: c * 10 + 50, points: c * 1 + 5 };
}

export function addCapture(captures, id) {
  return { ...captures, [id]: (captures[id] || 0) + 1 };
}

export function isEvolved(captures, id, threshold = EVOLVE_AT) {
  return (captures[id] || 0) >= threshold;
}

export function ownedCount(captures) {
  return Object.keys(captures).length;
}
```
- [ ] **Step 4: 成功確認** — Run: `npm test` / Expected: PASS
- [ ] **Step 5: コミット** — `git add -A && git commit -m "feat: やる気計算(レベル・獲得・捕獲・進化)"`

---

### Task 2: state.js を v4 化(defaultState・recordSession)

**Files:**
- Modify: `js/state.js`
- Test: `tests/state-v4.test.mjs`

**Interfaces:**
- Consumes: `sessionGain`,`addCapture`(Task1)
- Produces: `defaultState()` の各 progress に `xp:0, points:0, captures:{}` を持ち `monsters` を持たない。`settings` に `rewards:[], rewardLog:[]`。`SCHEMA_VERSION=4`。`recordSession(state, profileId, battle, todayStr)` は捕獲を `captures` に加算、`xp`/`points` を `sessionGain` で加算、streak/sessions は従来通り。attempts も従来通り。

- [ ] **Step 1: 失敗テスト** — `tests/state-v4.test.mjs`
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultState, recordSession } from "../js/state.js";

test("defaultState v4: xp/points/captures と settings.rewards", () => {
  const s = defaultState();
  assert.equal(s.version, 4);
  for (const p of s.profiles) {
    const pr = s.progress[p.id];
    assert.equal(pr.xp, 0);
    assert.equal(pr.points, 0);
    assert.deepEqual(pr.captures, {});
    assert.equal(pr.monsters, undefined);
  }
  assert.deepEqual(s.settings.rewards, []);
  assert.deepEqual(s.settings.rewardLog, []);
});

test("recordSession: captures加算・xp/points加算・streak/sessions", () => {
  const battle = {
    monster: { id: "yukibo" },
    correctCount: 8,
    results: [{ skillTag: "kuku", correct: true }],
    finished: true,
  };
  const s1 = recordSession(defaultState(), "p1", battle, "2026-07-08");
  const pr = s1.progress.p1;
  assert.equal(pr.captures.yukibo, 1);
  assert.equal(pr.xp, 8 * 10 + 50); // 130
  assert.equal(pr.points, 8 + 5); // 13
  assert.equal(pr.sessions, 1);
  assert.equal(pr.streak, 1);
  assert.equal(s1.attempts.length, 1);
  // 同じモンスターをもう一度 → captures 2
  const s2 = recordSession(s1, "p1", battle, "2026-07-08");
  assert.equal(s2.progress.p1.captures.yukibo, 2);
  assert.equal(s2.progress.p1.xp, 260);
});
```

- [ ] **Step 2: 失敗確認** — Run: `npm test` / Expected: FAIL
- [ ] **Step 3: 実装** — `js/state.js`
  - 先頭の import に追加: `import { sessionGain, addCapture } from "./progress-calc.js";`
  - `SCHEMA_VERSION` を `4` に。
  - `defaultState()` の各 progress を `{ streak: 0, lastPlayedDate: null, captures: {}, sessions: 0, xp: 0, points: 0 }` に(monsters を削除)。`settings` を `{ pin: null, rewards: [], rewardLog: [] }` に。
  - `recordSession` を差し替え:
```js
export function recordSession(state, profileId, battle, todayStr) {
  const prog = state.progress[profileId];
  const gain = sessionGain(battle);
  return {
    ...state,
    progress: {
      ...state.progress,
      [profileId]: {
        ...prog,
        ...updateStreak(prog, todayStr),
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
- [ ] **Step 4: 成功確認** — Run: `npm test` / Expected: PASS(既存 state 系テストのうち version=3 期待や monsters 参照は次Task3の移行更新で直す。この時点で **state.test.mjs / state-v3.test.mjs が version/monsters 前提で落ちるものは残ってよい**が、落ちる数を報告)
- [ ] **Step 5: コミット** — `git add -A && git commit -m "feat: state v4(xp/points/captures・recordSession拡張)"`

---

### Task 3: load の移行(v2→v3→v4)＋既存テスト更新

**Files:**
- Modify: `js/state.js`(load), `tests/state-v3.test.mjs`, `tests/state.test.mjs`
- Test: `tests/state-migrate-v4.test.mjs`

**Interfaces:**
- Produces: `load(storage)` は保存版に応じて v2→v3→v4 と順に持ち上げ、最終 v4 を返す。v3→v4: 各 progress に `xp:0, points:0` を追加、`monsters:[...]` を `captures`(各id=1回)に変換し `monsters` 削除、`settings` に `rewards:[], rewardLog:[]` を付与。v1・型不正は defaultState。冪等(v4を読んでも不変)。

- [ ] **Step 1: 失敗テスト** — `tests/state-migrate-v4.test.mjs`
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { load } from "../js/state.js";

function mem() { const m = new Map(); return { getItem:(k)=>m.has(k)?m.get(k):null, setItem:(k,v)=>m.set(k,v) }; }

test("v3→v4: monsters→captures・xp/points・rewards、進捗保持", () => {
  const st = mem();
  const v3 = {
    version: 3,
    profiles: [{ id: "p1", nickname: "1ねんせい", grade: 1, avatar: "🦊" }],
    progress: { p1: { streak: 5, lastPlayedDate: "2026-07-07", monsters: ["yukibo", "akitan"], sessions: 9 } },
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

test("v2→v4も一気通貫(4学年デフォルト構造+captures)", () => {
  const st = mem();
  const v2 = {
    version: 2,
    profiles: [{ id: "p1", nickname: "1ねんせい", grade: 1, avatar: "🦊" }],
    progress: { p1: { streak: 2, lastPlayedDate: "x", monsters: ["yukibo"], sessions: 1 } },
    attempts: [],
  };
  st.setItem("manabi-quest-v1", JSON.stringify(v2));
  const s = load(st);
  assert.equal(s.version, 4);
  assert.deepEqual(s.progress.p1.captures, { yukibo: 1 });
  assert.equal(s.progress.p1.xp, 0);
  assert.deepEqual(s.settings.rewards, []);
});

test("v4は冪等(読んでも変わらない)", () => {
  const st = mem();
  const v4 = {
    version: 4,
    profiles: [{ id: "p1", nickname: "x", grade: 1, avatar: "🦊" }],
    progress: { p1: { streak: 1, lastPlayedDate: "x", captures: { yukibo: 3 }, sessions: 4, xp: 130, points: 13 } },
    attempts: [],
    settings: { pin: null, rewards: [{ id: "r1", name: "アイス", cost: 50 }], rewardLog: [] },
  };
  st.setItem("manabi-quest-v1", JSON.stringify(v4));
  const s = load(st);
  assert.equal(s.progress.p1.captures.yukibo, 3);
  assert.equal(s.progress.p1.xp, 130);
  assert.deepEqual(s.settings.rewards, [{ id: "r1", name: "アイス", cost: 50 }]);
});

test("v1・破損はデフォルト(v4)へ", () => {
  const st = mem();
  st.setItem("manabi-quest-v1", JSON.stringify({ version: 1 }));
  assert.equal(load(st).version, 4);
  assert.equal(load(st).profiles.length, 4);
});
```

- [ ] **Step 2: 失敗確認** — Run: `npm test` / Expected: FAIL
- [ ] **Step 3: 実装** — `js/state.js` の `load` を段階移行に:
```js
function migrateV2toV3(s) {
  return { ...s, version: 3, settings: { pin: null } };
}
function migrateV3toV4(s) {
  const progress = {};
  for (const [pid, pr] of Object.entries(s.progress)) {
    const captures = {};
    for (const id of pr.monsters || []) captures[id] = 1;
    const { monsters, ...rest } = pr;
    progress[pid] = { ...rest, captures, xp: rest.xp ?? 0, points: rest.points ?? 0 };
  }
  return {
    ...s,
    version: 4,
    progress,
    settings: { ...(s.settings || { pin: null }), rewards: [], rewardLog: [] },
  };
}

export function load(storage) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    let s = JSON.parse(raw);
    if (!s || typeof s !== "object") return defaultState();
    if (s.version === SCHEMA_VERSION) return s;
    // v2/v3(4学年プロフィール構造)を順に持ち上げる
    if (s.version === 2 && Array.isArray(s.profiles) && s.progress && Array.isArray(s.attempts)) {
      s = migrateV2toV3(s);
    }
    if (s.version === 3 && Array.isArray(s.profiles) && s.progress && Array.isArray(s.attempts)) {
      s = migrateV3toV4(s);
    }
    if (s.version === SCHEMA_VERSION) return s;
    return defaultState();
  } catch {
    return defaultState();
  }
}
```
- [ ] **Step 4: 既存テスト更新** — `tests/state-v3.test.mjs` と `tests/state.test.mjs` を v4 前提に修正:
  - version を 3 と期待している箇所を 4 に。
  - `monsters` を参照/期待している箇所を `captures` に(例: `defaultState` の monsters=[] を captures={} に)。`state-v3.test.mjs` の「v2→v3移行」テストは、今や v4 まで上がるので version 4 を期待し captures を確認する形に更新(または当該アサートを移行テストへ集約)。
  - `state.test.mjs` の recordSession テストが `monsters` を見ているなら `captures` に更新(id=回数)。
- [ ] **Step 5: 成功確認** — Run: `npm test` / Expected: PASS(全テスト)。**version/monsters 起因の失敗がゼロ**であること。
- [ ] **Step 6: コミット** — `git add -A && git commit -m "feat: v2→v3→v4 段階移行(monsters→captures・進捗保持)"`

---

### Task 4: app.js を captures 対応＋ホーム/結果に Lv・XP・ポイント表示

**Files:**
- Modify: `js/app.js`, `css/style.css`
- 手動テスト(ブラウザ)

**Interfaces:**
- Consumes: `levelFromXp`,`ownedCount`,`isEvolved`,`sessionGain`(progress-calc), `recordSession`(state)
- Produces: app.js 内の `progress().monsters` 参照をすべて `captures` ベースに置換。ホームに Lv・XPバー・ポイント残高。結果画面に獲得XP/ポイント表示。

- [ ] **Step 1: import 追加** — `js/app.js` 冒頭の import 群に:
```js
import { levelFromXp, ownedCount, isEvolved, sessionGain } from "./progress-calc.js";
```

- [ ] **Step 2: monsters 参照を captures に置換**(app.js 全体)
  - `progress().monsters.length` → `ownedCount(progress().captures)`
  - `progress().monsters.includes(id)` / `new Set(progress().monsters)` → `progress().captures[id] > 0` 判定(図鑑の所持判定)。図鑑セルの所持は `progress().captures[m.id] > 0`。
  - 結果画面・ホームの「ずかん X/20」も `ownedCount(progress().captures)` に。

- [ ] **Step 3: ホームに Lv・XP・ポイント**(renderHome の streak カード付近)
```js
  const prog = progress();
  const lv = levelFromXp(prog.xp);
  // 既存のホーム innerHTML の streak カードの下に追記:
  //   <div class="card streak">⭐ Lv <b>${lv.level}</b>
  //     <div class="xpbar"><div style="width:${(lv.inLevel / lv.need) * 100}%"></div></div>
  //     🪙 ポイント <b>${prog.points}</b></div>
```
既存の `renderHome` の innerHTML に上記カードを追加(streakカードの直後)。

- [ ] **Step 4: 結果画面に獲得表示**(finishBattle 内、recordSession 後)
```js
  const gain = sessionGain(b); // b は完了した battle
  // 結果の streak カードに獲得を追記:
  //   <br>⭐ +${gain.xp}XP / 🪙 +${gain.points}ポイント
```
`finishBattle` の結果 innerHTML の該当カードに上記を差し込む。

- [ ] **Step 5: CSS** — `css/style.css` に:
```css
.xpbar { height: 12px; background: rgba(0,0,0,.4); border-radius: 6px; overflow: hidden; margin: 6px 0; }
.xpbar > div { height: 100%; background: linear-gradient(#ffd86b, #ff9f1c); transition: width .3s; }
```

- [ ] **Step 6: ブラウザ手動確認** — `python -m http.server 8420` → playwright/chrome-devtools MCP(ToolSearchで読込)。localStorage をクリアして: プロフィール選択→ホームに Lv1・ポイント0 表示→バトル1回→結果に「+XP/+ポイント」表示→ホームで Lv/XP/ポイントが増える→図鑑の所持数が増える。コンソールエラー無し。確認後サーバ停止。
- [ ] **Step 7: コミット** — `git add -A && git commit -m "feat: ホーム/結果にLv・XP・ポイント表示、capturesベースに移行"`

---

### Task 5: ごほうびポイント帳(親が一覧・親が交換)

**Files:**
- Modify: `js/state.js`, `js/app.js`, `css/style.css`
- Test: `tests/reward.test.mjs`

**Interfaces:**
- Produces: `exchangeReward(state, profileId, reward, dateStr) -> { ok, state }`(state.js)。残高十分なら points を cost 減算し `settings.rewardLog` に記録して `ok:true`。不足なら `ok:false` で state 不変。親ページにごほうび一覧の登録/削除と、子ごとの交換ボタン。子側にポイント残高＋ごほうび一覧の閲覧。

- [ ] **Step 1: 失敗テスト** — `tests/reward.test.mjs`
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { exchangeReward, defaultState } from "../js/state.js";

function withPoints(n) {
  const s = defaultState();
  s.progress.p1.points = n;
  s.settings.rewards = [{ id: "r1", name: "アイス", cost: 50 }];
  return s;
}

test("残高十分: ポイント減算・ログ記録・ok", () => {
  const { ok, state } = exchangeReward(withPoints(60), "p1", { id: "r1", name: "アイス", cost: 50 }, "2026-07-08");
  assert.equal(ok, true);
  assert.equal(state.progress.p1.points, 10);
  assert.equal(state.settings.rewardLog.length, 1);
  assert.deepEqual(state.settings.rewardLog[0], { date: "2026-07-08", profileId: "p1", name: "アイス", cost: 50 });
});

test("残高不足: ok=false・stateは変わらない", () => {
  const before = withPoints(30);
  const { ok, state } = exchangeReward(before, "p1", { id: "r1", name: "アイス", cost: 50 }, "2026-07-08");
  assert.equal(ok, false);
  assert.equal(state.progress.p1.points, 30);
  assert.equal(state.settings.rewardLog.length, 0);
});
```

- [ ] **Step 2: 失敗確認** — Run: `npm test` / Expected: FAIL
- [ ] **Step 3: 実装** — `js/state.js` に追加:
```js
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
```
- [ ] **Step 4: 成功確認** — Run: `npm test` / Expected: PASS

- [ ] **Step 5: 親ページにごほうび管理**(app.js renderParentDash に追記)。`exchangeReward`,`todayString` を import。ダッシュボードに以下を追加(既存の子カード群の後、ボタン群の前):
```js
  // ごほうび一覧管理
  const rewardRows = app.state.settings.rewards
    .map((r) => `<div class="rw-row">🎁 ${esc(r.name)} = ${r.cost}pt
      <button class="rw-del" data-id="${r.id}">けす</button></div>`).join("") || "まだ ありません";
  const childOpts = app.state.profiles
    .map((p) => `<option value="${p.id}">${esc(p.nickname)}(${app.state.progress[p.id].points}pt)</option>`).join("");
  const rewardOpts = app.state.settings.rewards
    .map((r) => `<option value="${r.id}">${esc(r.name)} (${r.cost}pt)</option>`).join("");
  // 上記を含むセクションを screen-parent の innerHTML に組み込み、
  //   <div class="card"><b>ごほうび一覧</b>${rewardRows}
  //     <input id="rw-name" placeholder="なまえ"><input id="rw-cost" inputmode="numeric" placeholder="ポイント">
  //     <button id="rw-add">ついか</button></div>
  //   <div class="card"><b>ごほうび交換</b>
  //     <select id="ex-child">${childOpts}</select><select id="ex-reward">${rewardOpts}</select>
  //     <button id="ex-do">こうかん</button><div id="ex-msg"></div></div>
```
配線(同 renderParentDash 内):
```js
  document.querySelectorAll(".rw-del").forEach((b) => b.addEventListener("click", () => {
    app.state.settings.rewards = app.state.settings.rewards.filter((r) => r.id !== b.dataset.id);
    save(localStorage, app.state); renderParentDash();
  }));
  const addBtn = $("#rw-add");
  if (addBtn) addBtn.addEventListener("click", () => {
    const name = $("#rw-name").value.trim();
    const cost = parseInt($("#rw-cost").value, 10);
    if (name && Number.isInteger(cost) && cost > 0) {
      app.state.settings.rewards.push({ id: "r" + app.state.settings.rewards.length + "-" + name, name, cost });
      save(localStorage, app.state); renderParentDash();
    }
  });
  const exBtn = $("#ex-do");
  if (exBtn) exBtn.addEventListener("click", () => {
    const pid = $("#ex-child").value;
    const reward = app.state.settings.rewards.find((r) => r.id === $("#ex-reward").value);
    if (!reward) return;
    const res = exchangeReward(app.state, pid, reward, todayString());
    if (res.ok) { app.state = res.state; save(localStorage, app.state); renderParentDash(); }
    else { $("#ex-msg").textContent = "ポイントが たりません"; }
  });
```
(rewards 配列は移行で必ず存在。id はユニークになるよう name＋index を含める。)

- [ ] **Step 6: 子側にポイント残高＋一覧の閲覧** — ホームの「🪙 ポイント」表示は Task4 で追加済み。加えてホームに「🎁 ごほうび」ボタンを足し、押すと `settings.rewards` の一覧(名前=必要pt)と自分の残高を見るだけの画面(`#screen-reward`)を表示。交換操作は無し(親のみ)。
  - `index.html` に `<section id="screen-reward" class="screen hidden"></section>` 追加。
  - `renderReward()` を実装: 残高＋一覧表示＋「もどる」。renderHome にボタン配線。

- [ ] **Step 7: CSS** — `css/style.css` に `.rw-row { margin: 4px 0; }` と select/input の見やすさ最低限(既存 input 流用で可)。

- [ ] **Step 8: ブラウザ確認** — 親ページでごほうび追加(アイス=50)→子のポイントを十分にして交換→残高が減る/不足で「たりません」。子側「🎁ごほうび」で一覧と残高が見える。確認後サーバ停止。
- [ ] **Step 9: コミット** — `git add -A && git commit -m "feat: ごほうびポイント帳(親が一覧登録・交換消し込み、子は閲覧)"`

---

### Task 6: 進化ロジックと図鑑・結果の進化表示(画像はフォールバック)

**Files:**
- Modify: `data/monsters.js`, `js/app.js`, `css/style.css`
- Test: `tests/monsters-evolve.test.mjs`

**Interfaces:**
- Produces: `data/monsters.js` の各モンスターに `evolveName`(進化後の名前)と `evolveImg: null`(画像はTask7)を追加。app.js は `isEvolved(captures, id)` が真なら図鑑・結果で進化後の名前＋(evolveImg があれば画像/無ければ絵文字)を表示し、捕獲でちょうど進化した瞬間に「しんか!」演出。

- [ ] **Step 1: 失敗テスト** — `tests/monsters-evolve.test.mjs`
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { MONSTERS } from "../data/monsters.js";

test("全モンスターに evolveName(1字以上)と evolveImg フィールド", () => {
  for (const m of MONSTERS) {
    assert.ok(m.evolveName && [...m.evolveName].length >= 1, m.id);
    assert.ok("evolveImg" in m, m.id);
  }
});
```

- [ ] **Step 2: 失敗確認** — Run: `npm test` / Expected: FAIL
- [ ] **Step 3: monsters.js に evolveName/evolveImg 追加** — 各20体に進化後名を付与(例: ゆきぼう→「だいゆきぼう」、なまはげん→「おおなまはげん」等、元名に大/王/超などを付けた素直な進化名)。全て `evolveImg: null`。既存フィールドは変更しない。
- [ ] **Step 4: 成功確認** — Run: `npm test` / Expected: PASS

- [ ] **Step 5: 図鑑の進化表示**(app.js renderZukan)。所持セルで `isEvolved(progress().captures, m.id)` が真なら、名前を `m.evolveName`、絵は `m.evolveImg` があれば画像・無ければ `m.emoji`(現状は絵文字フォールバック)。捕獲数 `progress().captures[m.id]` も小さく表示。詳細タップ時も進化後名/豆知識を表示。

- [ ] **Step 6: 結果画面の「しんか!」演出**(app.js finishBattle)。recordSession 前の captures と後の captures で判定:
```js
  const beforeEvolved = isEvolved(progress().captures, b.monster.id); // recordSession前
  // recordSession→save 後:
  const afterEvolved = isEvolved(progress().captures, b.monster.id);
  const justEvolved = !beforeEvolved && afterEvolved;
```
`justEvolved` が真なら結果の get-title を「🎉✨ ${b.monster.name} が ${b.monster.evolveName} に しんか!」にし、`.get-title` に `evolve` クラスを足して光る演出(CSS)。捕獲画像は進化後(evolveImg/絵文字)。

- [ ] **Step 7: CSS** — `css/style.css` に:
```css
.get-title.evolve { animation: pop .5s, glow 1.2s ease-in-out infinite alternate; }
@keyframes glow { from { text-shadow: 0 0 6px #ffd86b; } to { text-shadow: 0 0 18px #ff9f1c, 0 0 30px #ffd86b; } }
```

- [ ] **Step 8: ブラウザ確認** — 同じモンスターを狙って3回捕獲(乱数依存だが、localStorage の captures を直接3手前に設定してから1回捕獲する等で確認可)。3回目で「しんか!」演出＋図鑑が進化後名に。確認後サーバ停止。
- [ ] **Step 9: コミット** — `git add -A && git commit -m "feat: モンスター進化(3回捕獲)と図鑑・しんか演出(画像はフォールバック)"`

---

### Task 7: 進化後モンスター20体の画像生成 ⚠️ユーザー承認ゲート

**Files:**
- Create: `assets/evo-<id>.png`(20体)
- Modify: `data/monsters.js`(evolveImg)、`sw.js`(ASSETS/CACHE)

**Interfaces:**
- Consumes: `MONSTERS[].motifEn`,`evolveName`(Task6)
- Produces: `assets/evo-<id>.png`(512×640)、`data/monsters.js` の `evolveImg: "assets/evo-<id>.png"`

- [ ] **Step 1: プロンプト一覧をユーザーに提示して承認を得る(保管庫ルール・スキップ不可)**
進化後は「基本と同じモチーフの、より強く大きく進化した姿」。テンプレート(第2弾の全身クリーチャー画風を踏襲):
```
evolved stronger form of a full body creature monster, {motifEn}, bigger and more powerful evolution, original monster design inspired by pokemon and digimon, standing on two legs, whole body visible with arms legs and tail, cute JRPG collectible creature, cel shaded anime style, bold clean outline, vivid colors, dynamic heroic pose, plain soft background, full body centered in frame
```
20体分の {motifEn} 差し込み済み一覧を表にして提示し、OKをもらう。サイズ 512×640(基本と同じ)。

- [ ] **Step 2: 1枚ずつ生成(連射禁止・毎回目視検証・429は間隔を空けリトライ)** — 第2弾と同じ堅牢スクリプト方式:
```
node "D:\Desktop-Archive\fal-image-gen\generate.mjs" "<PROMPT>" --out "D:\Desktop-Archive\manabi-quest\assets\evo-<id>.png" --width 512 --height 640
```
生成後 Read で目視検証(崩れ・ダミー・怖すぎ)。ダメなら再生成。20体。

- [ ] **Step 3: monsters.js の evolveImg を埋める** — 各 `evolveImg: null` を `evolveImg: "assets/evo-<id>.png"` に(id基準の node スクリプトで確実に)。

- [ ] **Step 4: sw.js 更新** — ASSETS に `./assets/evo-<id>.png` 20件と `./js/progress-calc.js` を追加。`CACHE` を `"manabi-quest-v1.4.0"` に。

- [ ] **Step 5: テスト＋表示確認** — Run: `npm test` / Expected: PASS。ローカルサーバで進化後モンスターに画像が出ることを確認。
- [ ] **Step 6: コミット** — `git add -A && git commit -m "feat: 進化後モンスター20体の画像"`

---

### Task 8: PWA更新・公開

**Files:**
- Modify: `sw.js`(未反映なら progress-calc.js 追加確認・CACHE), `README.md`
- Deploy: master へマージ→push

- [ ] **Step 1: sw.js 確認** — ASSETS に `./js/progress-calc.js` と進化画像が入り、`CACHE` が上がっていること(Task7で実施済みなら確認のみ。未実施項目があれば補う)。
- [ ] **Step 2: README 更新** — やる気の仕組み(レベル・ごほうびポイント帳・進化)を追記。
- [ ] **Step 3: 全テスト＋ブラウザ最終確認** — `npm test` 全通過。Lv/XP/ポイント・ごほうび交換・進化・しんか演出・オフラインを確認。
- [ ] **Step 4: 公開** — 作業ブランチを master へマージ→`git push`。数分後 `https://takagifamilyclinic-source.github.io/manabi-quest/` で反映を確認(WebFetch/ブラウザ)。
- [ ] **Step 5: 最終報告** — 公開URLと新機能を案内。

---

## Self-Review結果
- **スペック照合**: XP/レベル(T1,T4)/ごほうびポイント帳(T5)/進化3回(T1 isEvolved・T6)/schema v4移行(T2,T3)/進化画像20体・承認ゲート(T7)/公開(T8)。設計の全項目カバー。
- **型整合**: `levelFromXp(xp)->{level,inLevel,need}`、`sessionGain(battle)->{xp,points}`、`addCapture`/`isEvolved`/`ownedCount`、`recordSession`(captures/xp/points)、`exchangeReward(state,profileId,reward,dateStr)->{ok,state}`、`captures{id:回数}`、`settings.rewards[{id,name,cost}]`/`rewardLog[{date,profileId,name,cost}]` は各タスクで一貫。
- **既知の注意**: T2→T3間で既存 state テストが version/monsters 前提で一時失敗しうる旨を明記(T3 Step4で更新)。app.js の monsters→captures 置換漏れは T4 のブラウザ確認で検出。進化画像が無い間は絵文字フォールバック(T6)。
- **プレースホルダ**: ロジックは完全コード。進化名(20体)と進化プロンプトは実装時に作成(T6/T7)、T7はプロンプト承認ゲートで内容確定。
