# まなびクエスト 第2弾 Implementation Plan(漢字・苦手調整・親ページ)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 既存の算数バトルPWAに、漢字(1〜4年)バトル・苦手分野の自動出題調整・親ページ(PIN/苦手分析/記録書き出し)を追加する。

**Architecture:** 既存の純粋モジュール構成を踏襲。教科横断の出題は新規 `session.js` が算数(`math-gen`)と漢字(`kanji-quiz`)を束ね、`weakness.js` の重みで苦手を多めに出す。漢字元データは学年別JS。UI(`app.js`)に教科えらび・漢字4択・親ページを追加。

**Tech Stack:** Vanilla JS (ES modules) / PWA / node:test / 依存ゼロ

## Global Constraints

- 課金ゼロ・npm依存ゼロ・外部CDN無し・node標準のみ・ESモジュール
- こどものデータは端末内(localStorage)のみ・外部送信しない
- こども向け: 文字大きめ・タッチボタン最小56px・誤答にペナルティ演出なし
- IP配慮: 既存モンスターのみ(追加生成しない)
- GitHub Pagesサブパス配信で壊れない相対パス(`./` `../`)
- **漢字の読み・意味は学年別漢字配当表(2020〜)に照合してから収録。捏造しない**
- 学年別配当字数(必達): 1年=80字 / 2年=160字 / 3年=200字 / 4年=202字
- 作業ディレクトリ: `D:\Desktop-Archive\manabi-quest`
- コミット末尾: 改行して `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
- スキーマ変更時は将来の本移行が必要(設計書TODO)。第2弾は未リリース同様に安全側でv2→リセット可

## File Structure

```
data/kanji/g1.js … g4.js   # 学年別 漢字元データ [{kanji, grade, yomi:[...], meaning, radical?, strokes?}]
js/kanji-quiz.js           # 漢字出題ビルダ(読み/書き/意味/部首/筆順)＋ダミー選択肢生成(純粋)
js/weakness.js             # 苦手重み weightBySkill(純粋)
js/session.js              # buildSession(教科横断＋苦手重みで1セッション生成)(純粋)
js/battle.js               # answer を choices有り=文字列一致に一般化(数値互換維持)
js/state.js                # settings.pin 追加・version 3
js/app.js                  # 教科えらび・漢字4択UI・親ページ・隠し入口
sw.js / manifest.json      # 漢字アセット追加・CACHE更新
tests/*.test.mjs
```

---

### Task 1: battle.js の正誤判定を一般化(選択肢=文字列一致)

**Files:**
- Modify: `js/battle.js`
- Test: `tests/battle-choices.test.mjs`

**Interfaces:**
- Produces: `answer(battle, value)` は、`question.choices` があれば `value === question.answer`(厳密一致)、無ければ従来どおり `Number(value) === question.answer`。

- [ ] **Step 1: 失敗テスト** — `tests/battle-choices.test.mjs`

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { createBattle, answer } from "../js/battle.js";

const KQ = [
  { skillTag: "kanji-read-g1", text: "学の よみは?", choices: ["がく", "こう", "ねん"], answer: "がく", explanation: "がっこうの がく" },
];
const MON = { id: "yukibo", name: "ゆきぼう" };

test("選択肢問題は文字列の完全一致で正解判定", () => {
  const r = answer(createBattle(KQ, MON), "がく");
  assert.equal(r.correct, true);
});
test("選択肢問題で違う選択肢は不正解", () => {
  const r = answer(createBattle(KQ, MON), "こう");
  assert.equal(r.correct, false);
});
test("数値問題は従来どおり Number 比較(文字列入力OK)", () => {
  const mq = [{ skillTag: "kuku", text: "2×3=?", answer: 6, explanation: "x" }];
  assert.equal(answer(createBattle(mq, MON), "6").correct, true);
  assert.equal(answer(createBattle(mq, MON), "7").correct, false);
});
```

- [ ] **Step 2: 失敗確認** — Run: `cd /d/Desktop-Archive/manabi-quest && npm test` / Expected: FAIL(「がく」がNumber化でNaN→不一致)

- [ ] **Step 3: 実装** — `js/battle.js` の `answer` 内の1行を変更:

```js
  const correct =
    question.choices != null
      ? value === question.answer
      : Number(value) === question.answer;
```

- [ ] **Step 4: 成功確認** — Run: `npm test` / Expected: PASS(既存battleテスト含め全通過)
- [ ] **Step 5: コミット** — `git add -A && git commit`(メッセージ: `feat: battleの正誤判定を選択肢問題に一般化`)

---

### Task 2: 漢字元データ 1年(80字)

**Files:**
- Create: `data/kanji/g1.js`
- Test: `tests/kanji-data-g1.test.mjs`

**Interfaces:**
- Produces: `export const KANJI_G1 = [{ kanji: "一", grade: 1, yomi: ["いち","ひと"], meaning: "ひとつ" }, …80字]`

**授業(実装者向け):** 1年配当漢字は**学年別漢字配当表の1年80字(確定・公開)**。下記の80字を**この集合のまま**収録する(字の増減禁止)。各字に `yomi`(主要な訓・音を1〜3個・ひらがな/カタカナ可)と `meaning`(こども向けの短い日本語)を付ける。**読みは配当表・辞書で照合してから書く(不確かなら辞書優先)**。

1年80字(学年別漢字配当表・この集合をそのまま使う。増減・置換禁止):
一 右 雨 円 王 音 下 火 花 貝 学 気 九 休 玉 金 空 月 犬 見 五 口 校 左 三 山 子 四 糸 字 耳 七 車 手 十 出 女 小 上 森 人 水 正 生 青 夕 石 赤 千 川 先 早 草 足 村 大 男 竹 中 虫 町 天 田 土 二 日 入 年 白 八 百 文 木 本 名 目 立 力 林 六

- [ ] **Step 1: 失敗テスト** — `tests/kanji-data-g1.test.mjs`

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { KANJI_G1 } from "../data/kanji/g1.js";

test("1年は80字・重複なし", () => {
  assert.equal(KANJI_G1.length, 80);
  assert.equal(new Set(KANJI_G1.map((k) => k.kanji)).size, 80);
});
test("全字が grade=1・yomi≥1・meaning・単一漢字", () => {
  for (const k of KANJI_G1) {
    assert.equal(k.grade, 1, k.kanji);
    assert.ok(Array.isArray(k.yomi) && k.yomi.length >= 1, k.kanji);
    assert.ok([...k.kanji].length === 1, `${k.kanji} は1字でない`);
    assert.ok(k.meaning && k.meaning.length >= 1, k.kanji);
  }
});
```

- [ ] **Step 2: 失敗確認** — Run: `npm test` / Expected: FAIL(module無し)
- [ ] **Step 3: 実装** — `data/kanji/g1.js` に80字を上記条件で作成(注意: 「足」は上のリストに重複表記があるため80ユニークになるよう正しい配当表集合で作る。最終的に80ユニーク字)。Writeツールで日本語が化けないように。
- [ ] **Step 4: 成功確認** — Run: `npm test` / Expected: PASS
- [ ] **Step 5: 出典照合レビュー(必須)** — レビュー担当が各字の yomi を配当表/辞書と照合し、誤り・不足を指摘。修正後に次へ。
- [ ] **Step 6: コミット** — `feat: 漢字元データ1年80字`

---

### Task 3: 漢字元データ 2〜4年(160/200/202字)

**Files:**
- Create: `data/kanji/g2.js`, `data/kanji/g3.js`, `data/kanji/g4.js`
- Test: `tests/kanji-data-g234.test.mjs`

**Interfaces:**
- Produces: `KANJI_G2`(160)/`KANJI_G3`(200)/`KANJI_G4`(202)。構造は g1 と同じ。

**授業:** 各学年は**学年別漢字配当表の該当集合(確定・公開)**を使う。字の集合は配当表どおり(推測で足さない)。yomi/meaning は配当表・辞書照合。データ量が多いので**学年ごとに分けて作成→学年ごとに出典照合レビュー**する。

- [ ] **Step 1: 失敗テスト** — `tests/kanji-data-g234.test.mjs`

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { KANJI_G2 } from "../data/kanji/g2.js";
import { KANJI_G3 } from "../data/kanji/g3.js";
import { KANJI_G4 } from "../data/kanji/g4.js";

const check = (arr, grade, n) => {
  assert.equal(arr.length, n);
  assert.equal(new Set(arr.map((k) => k.kanji)).size, n);
  for (const k of arr) {
    assert.equal(k.grade, grade, k.kanji);
    assert.ok(k.yomi.length >= 1 && [...k.kanji].length === 1 && k.meaning, k.kanji);
  }
};
test("2年160字", () => check(KANJI_G2, 2, 160));
test("3年200字", () => check(KANJI_G3, 3, 200));
test("4年202字", () => check(KANJI_G4, 4, 202));
```

- [ ] **Step 2: 失敗確認** — Run: `npm test` / Expected: FAIL
- [ ] **Step 3: 実装(g2)** → **Step 4: g3** → **Step 5: g4**(各Writeで作成)
- [ ] **Step 6: 成功確認** — Run: `npm test` / Expected: PASS(字数・一意)
- [ ] **Step 7: 出典照合レビュー(学年ごと・必須)** — yomi/meaning を配当表・辞書照合。修正。
- [ ] **Step 8: コミット** — `feat: 漢字元データ2〜4年`

---

### Task 4: kanji-quiz.js(読み・書きの出題＋ダミー選択肢)

**Files:**
- Create: `js/kanji-quiz.js`
- Test: `tests/kanji-quiz.test.mjs`

**Interfaces:**
- Consumes: `KANJI_G<N>`(Task2/3)
- Produces:
  - `KANJI_BY_GRADE = {1:KANJI_G1,2:KANJI_G2,3:KANJI_G3,4:KANJI_G4}`
  - `kanjiSkills(grade) -> ["kanji-read-g<grade>","kanji-write-g<grade>"]`(意味/部首/筆順はTask10で追加)
  - `makeKanjiQuestion(skillTag, rng) -> {subject:"kanji", skillTag, text, choices:[4], answer, explanation}`
    - `kanji-read-g<N>`: text=「〈漢字〉の よみは どれ?」, choices=かな4つ(正解=その字のyomi[0]、ダミー=同学年他字のyomiから重複しない3つ), answer=正解かな, explanation=「〈漢字〉= 〈meaning〉」
    - `kanji-write-g<N>`: text=「「〈かな〉」の かんじは どれ?」, choices=漢字4つ(正解=その字、ダミー=同学年他字3つ), answer=漢字, explanation=meaning

- [ ] **Step 1: 失敗テスト** — `tests/kanji-quiz.test.mjs`

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { makeKanjiQuestion, kanjiSkills, KANJI_BY_GRADE } from "../js/kanji-quiz.js";

test("kanjiSkills は読み・書きを返す", () => {
  assert.deepEqual(kanjiSkills(1), ["kanji-read-g1", "kanji-write-g1"]);
});

test("読み問題: choices4つ・正解を含む・重複なし・正解はその字のyomi", () => {
  for (let i = 0; i < 400; i++) {
    const q = makeKanjiQuestion("kanji-read-g1");
    assert.equal(q.subject, "kanji");
    assert.equal(q.choices.length, 4);
    assert.equal(new Set(q.choices).size, 4);
    assert.ok(q.choices.includes(q.answer));
    // 正解かなが1年のどれかの字のyomiに含まれる
    const ok = KANJI_BY_GRADE[1].some((k) => k.yomi.includes(q.answer));
    assert.ok(ok, q.answer);
  }
});

test("書き問題: choices4つ・正解は漢字・重複なし", () => {
  for (let i = 0; i < 400; i++) {
    const q = makeKanjiQuestion("kanji-write-g2");
    assert.equal(q.choices.length, 4);
    assert.equal(new Set(q.choices).size, 4);
    assert.ok(q.choices.includes(q.answer));
    assert.ok([...q.answer].length === 1);
  }
});

test("未知スキルはエラー", () => {
  assert.throws(() => makeKanjiQuestion("kanji-read-g9"));
});
```

- [ ] **Step 2: 失敗確認** — Run: `npm test` / Expected: FAIL
- [ ] **Step 3: 実装** — `js/kanji-quiz.js`

```js
// 漢字の出題ビルダ(純粋)。読み・書きを同一元データから生成。
import { KANJI_G1 } from "../data/kanji/g1.js";
import { KANJI_G2 } from "../data/kanji/g2.js";
import { KANJI_G3 } from "../data/kanji/g3.js";
import { KANJI_G4 } from "../data/kanji/g4.js";

export const KANJI_BY_GRADE = { 1: KANJI_G1, 2: KANJI_G2, 3: KANJI_G3, 4: KANJI_G4 };

export function kanjiSkills(grade) {
  return [`kanji-read-g${grade}`, `kanji-write-g${grade}`];
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}
// arr から exclude を除いて n 個ユニーク抽出
function sampleUnique(rng, arr, n, exclude) {
  const pool = arr.filter((x) => !exclude.has(x));
  const out = [];
  const used = new Set();
  let guard = 0;
  while (out.length < n && guard++ < 1000 && pool.length) {
    const c = pick(rng, pool);
    if (!used.has(c)) {
      used.add(c);
      out.push(c);
    }
  }
  return out;
}
function shuffle(rng, arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function makeKanjiQuestion(skillTag, rng = Math.random) {
  const m = skillTag.match(/^kanji-(read|write)-g(\d)$/);
  if (!m) throw new Error(`unknown kanji skill: ${skillTag}`);
  const kind = m[1];
  const grade = Number(m[2]);
  const list = KANJI_BY_GRADE[grade];
  if (!list) throw new Error(`unknown grade: ${grade}`);
  const target = pick(rng, list);

  if (kind === "read") {
    const answer = target.yomi[0];
    const otherYomi = [];
    for (const k of list) if (k.kanji !== target.kanji) otherYomi.push(...k.yomi);
    const dummies = sampleUnique(rng, otherYomi, 3, new Set([answer, ...target.yomi]));
    const choices = shuffle(rng, [answer, ...dummies]);
    return {
      subject: "kanji",
      skillTag,
      text: `「${target.kanji}」の よみは どれ?`,
      choices,
      answer,
      explanation: `${target.kanji} = ${target.meaning}`,
    };
  }
  // write: かな → 漢字
  const answer = target.kanji;
  const others = list.filter((k) => k.kanji !== target.kanji).map((k) => k.kanji);
  const dummies = sampleUnique(rng, others, 3, new Set([answer]));
  const choices = shuffle(rng, [answer, ...dummies]);
  return {
    subject: "kanji",
    skillTag,
    text: `「${target.yomi[0]}」の かんじは どれ?`,
    choices,
    answer,
    explanation: `${target.kanji} = ${target.meaning}`,
  };
}
```

- [ ] **Step 4: 成功確認** — Run: `npm test` / Expected: PASS
- [ ] **Step 5: コミット** — `feat: 漢字出題ビルダ(読み・書き・4択)`

---

### Task 5: weakness.js(苦手の重み付け)

**Files:**
- Create: `js/weakness.js`
- Test: `tests/weakness.test.mjs`

**Interfaces:**
- Consumes: `attempts`([{profileId, skillTag, correct, date}])
- Produces: `weightBySkill(skills, attempts, profileId, opts?) -> number[]`。直近RECENT件(既定40)で各skillの正答率pを出し、重み=`1 + WEAK*(1-p)`(既定WEAK=2)。実績ゼロは重み1(標準)。下限は式より1以上。

- [ ] **Step 1: 失敗テスト** — `tests/weakness.test.mjs`

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { weightBySkill } from "../js/weakness.js";

const A = (skillTag, correct, n) =>
  Array.from({ length: n }, () => ({ profileId: "p1", skillTag, correct, date: "2026-07-08" }));

test("実績ゼロは全て重み1", () => {
  const w = weightBySkill(["a", "b"], [], "p1");
  assert.deepEqual(w, [1, 1]);
});

test("正答率が低いスキルほど重みが大きい", () => {
  const attempts = [...A("a", false, 10), ...A("b", true, 10)];
  const [wa, wb] = weightBySkill(["a", "b"], attempts, "p1");
  assert.ok(wa > wb, `wa=${wa} wb=${wb}`);
  assert.ok(wb >= 1); // 下限
});

test("他プロフィールの実績は無視", () => {
  const attempts = [{ profileId: "p2", skillTag: "a", correct: false, date: "x" }];
  assert.deepEqual(weightBySkill(["a"], attempts, "p1"), [1]);
});

test("全問正解でも重みは1以上(下限)", () => {
  const [w] = weightBySkill(["a"], A("a", true, 20), "p1");
  assert.ok(w >= 1);
});
```

- [ ] **Step 2: 失敗確認** — Run: `npm test` / Expected: FAIL
- [ ] **Step 3: 実装** — `js/weakness.js`

```js
// 苦手スキルほど大きい重みを返す(純粋)。直近RECENT件の正答率を使う。
const RECENT = 40;
const WEAK = 2;

export function weightBySkill(skills, attempts, profileId, opts = {}) {
  const recent = opts.recent ?? RECENT;
  const weak = opts.weak ?? WEAK;
  const mine = attempts.filter((a) => a.profileId === profileId);
  return skills.map((skill) => {
    const rows = mine.filter((a) => a.skillTag === skill).slice(-recent);
    if (rows.length === 0) return 1;
    const p = rows.filter((a) => a.correct).length / rows.length;
    return 1 + weak * (1 - p); // p=1→1, p=0→1+weak
  });
}
```

- [ ] **Step 4: 成功確認** — Run: `npm test` / Expected: PASS
- [ ] **Step 5: コミット** — `feat: 苦手スキルの重み付け`

---

### Task 6: session.js(教科横断＋苦手重みで1セッション生成)

**Files:**
- Create: `js/session.js`
- Test: `tests/session.test.mjs`
- Modify: `js/app.js`(startBattleがsession.jsを使う)

**Interfaces:**
- Consumes: `GRADE_SKILLS`,`generateQuestion`(math-gen), `kanjiSkills`,`makeKanjiQuestion`(kanji-quiz), `weightBySkill`(weakness)
- Produces: `buildSession(grade, subject, opts) -> question[]`。opts={count=10, attempts=[], profileId, rng=Math.random}。subject="math"|"kanji"。苦手重みでskillTagを重み付き抽選し、各質問を生成。数学問題は既存の `{skillTag,text,answer,explanation}`(choicesなし)、漢字は `{subject,skillTag,text,choices,answer,explanation}`。

- [ ] **Step 1: 失敗テスト** — `tests/session.test.mjs`

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSession } from "../js/session.js";
import { GRADE_SKILLS } from "../js/math-gen.js";
import { kanjiSkills } from "../js/kanji-quiz.js";

test("math: 指定学年のskillのみ・count個・choicesなし", () => {
  const qs = buildSession(1, "math", { count: 10 });
  assert.equal(qs.length, 10);
  for (const q of qs) {
    assert.ok(GRADE_SKILLS[1].includes(q.skillTag));
    assert.equal(q.choices, undefined);
  }
});

test("kanji: 指定学年の漢字skillのみ・choices4つ", () => {
  const qs = buildSession(2, "kanji", { count: 10 });
  assert.equal(qs.length, 10);
  for (const q of qs) {
    assert.ok(kanjiSkills(2).includes(q.skillTag));
    assert.equal(q.choices.length, 4);
  }
});

test("苦手(正答率0)のskillが多めに選ばれる", () => {
  const attempts = Array.from({ length: 20 }, () => ({
    profileId: "p1", skillTag: "add-basic", correct: false, date: "x",
  }));
  const rng = mulberry32(42);
  const qs = buildSession(1, "math", { count: 200, attempts, profileId: "p1", rng });
  const n = qs.filter((q) => q.skillTag === "add-basic").length;
  // 4スキル均等なら約50。苦手重み付けで有意に多いはず(>70)
  assert.ok(n > 70, `add-basic=${n}`);
});

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

- [ ] **Step 2: 失敗確認** — Run: `npm test` / Expected: FAIL
- [ ] **Step 3: 実装** — `js/session.js`

```js
// 教科横断のセッション生成(純粋)。苦手重みでskillTagを選び質問を作る。
import { GRADE_SKILLS, generateQuestion } from "./math-gen.js";
import { kanjiSkills, makeKanjiQuestion } from "./kanji-quiz.js";
import { weightBySkill } from "./weakness.js";

function skillsFor(grade, subject) {
  if (subject === "math") {
    const s = GRADE_SKILLS[grade];
    if (!s) throw new Error(`unknown grade: ${grade}`);
    return s;
  }
  if (subject === "kanji") return kanjiSkills(grade);
  throw new Error(`unknown subject: ${subject}`);
}

function weightedPick(rng, items, weights) {
  const total = weights.reduce((s, w) => s + w, 0);
  let r = rng() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r < 0) return items[i];
  }
  return items[items.length - 1];
}

export function buildSession(grade, subject, opts = {}) {
  const { count = 10, attempts = [], profileId = null, rng = Math.random } = opts;
  const skills = skillsFor(grade, subject);
  const weights = weightBySkill(skills, attempts, profileId);
  const make = (skill) =>
    subject === "math" ? generateQuestion(skill, rng) : makeKanjiQuestion(skill, rng);
  return Array.from({ length: count }, () => make(weightedPick(rng, skills, weights)));
}
```

- [ ] **Step 4: 成功確認** — Run: `npm test` / Expected: PASS
- [ ] **Step 5: app.js の startBattle を差し替え** — `js/app.js`:

現状:
```js
function startBattle() {
  const questions = generateSession(profile().grade, 10);
  const monster = pickEncounter(MONSTERS);
  ...
```
を、教科を引数に取り buildSession を使う形へ(教科えらびはTask7で追加。ここでは既定 "math" で動くように):
```js
function startBattle(subject = "math") {
  const questions = buildSession(profile().grade, subject, {
    count: 10,
    attempts: app.state.attempts,
    profileId: app.profileId,
  });
  app.subject = subject;
  const monster = pickEncounter(MONSTERS);
  app.battle = createBattle(questions, monster);
  app.input = "";
  renderQuestion();
  show("#screen-battle");
}
```
import も差し替え: `import { buildSession } from "./session.js";`(不要になった `generateSession` importは残してもよいが未使用なら削除)。

- [ ] **Step 6: テスト & 手動起動確認** — `npm test` 全通過。`python -m http.server` で算数バトルが従来どおり動く(苦手重みが入っても算数は正常)ことを確認。
- [ ] **Step 7: コミット** — `feat: 教科横断セッション生成(苦手重み対応)`

---

### Task 7: 教科えらび＋漢字4択バトルUI

**Files:**
- Modify: `js/app.js`, `css/style.css`
- 手動テスト(ブラウザ)

**Interfaces:**
- Consumes: `startBattle(subject)`(Task6), 質問の `choices`
- Produces: ホーム「バトルにでかける」→教科えらび画面(➗さんすう/✏️かんじ)→対応バトル。漢字は4択ボタンUI(`renderQuestion` が `qn.choices` を見て分岐)。

- [ ] **Step 1: 教科えらび画面を追加** — `index.html` に `<section id="screen-subject" class="screen hidden"></section>` を追加(他screenと並べる)。

- [ ] **Step 2: app.js に教科えらび描画** — `renderHome` の「バトルにでかける」を教科えらびへ:

```js
function renderSubject() {
  $("#screen-subject").innerHTML = `
    <h1>きょうか を えらぶ</h1>
    <button id="sub-math">➗ さんすう</button>
    <button id="sub-kanji" class="secondary">✏️ かんじ</button>
    <button id="sub-back" class="secondary">もどる</button>
  `;
  $("#sub-math").addEventListener("click", () => startBattle("math"));
  $("#sub-kanji").addEventListener("click", () => startBattle("kanji"));
  $("#sub-back").addEventListener("click", renderHome);
  show("#screen-subject");
}
```
`renderHome` の `$("#btn-battle").addEventListener("click", startBattle);` を `("click", renderSubject)` に変更。

- [ ] **Step 3: renderQuestion を choices 対応に** — `qn.choices` があれば4択ボタン、無ければ従来テンキー:

```js
  const answerArea = qn.choices
    ? `<div class="choices">${qn.choices
        .map((c) => `<button class="choice" data-c="${c}">${c}</button>`)
        .join("")}</div>`
    : `<div class="answer-display" id="ans"></div>
       <div class="keypad">
         ${[1,2,3,4,5,6,7,8,9].map((n)=>`<button data-k="${n}">${n}</button>`).join("")}
         <button data-k="del">⌫</button><button data-k="0">0</button>
         <button data-k="ok" class="ok">こたえる!</button>
       </div>`;
```
`#screen-battle` の innerHTML の解答部分をこの `answerArea` に差し替え。イベント配線:
```js
  if (qn.choices) {
    document.querySelectorAll(".choice").forEach((btn) =>
      btn.addEventListener("click", () => { app.input = btn.dataset.c; submitAnswer(); }));
  } else {
    document.querySelectorAll(".keypad button").forEach((btn) =>
      btn.addEventListener("click", () => onKey(btn.dataset.k)));
    updateAnswerDisplay();
  }
```
`submitAnswer` は既存のまま(`answer(app.battle, app.input)` を呼ぶ。文字列選択肢もTask1で対応済み)。フィードバックの `question.text.replace("?", question.answer)` は漢字textに `?` が無い場合があるため、正解表示を `${question.answer}` 固定に調整:
```js
  fb.innerHTML = correct
    ? `<div class="mark">⭕</div><div>せいかい! こたえは ${question.answer}</div>
       <button id="fb-next">つぎへ ▶</button>`
    : `<div class="mark">❌</div><div>こたえは <b>${question.answer}</b></div>
       <div class="explain">💡 ${question.explanation}</div>
       <button id="fb-next">つぎへ ▶</button>`;
```

- [ ] **Step 4: choices のCSS** — `css/style.css` に追加:
```css
.choices { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.choices .choice { font-size: 1.8rem; min-height: 72px; }
```

- [ ] **Step 5: ブラウザ手動確認** — `python -m http.server` で: 教科えらび表示→「かんじ」→漢字の読み/書き問題が4択で出る→選択で正誤と解説→10問クリアで捕獲→図鑑数増加。算数側も従来どおり。コンソールエラー無し。playwright/chrome-devtools MCPで確認しスクショ。
- [ ] **Step 6: コミット** — `feat: 教科えらびと漢字4択バトルUI`

---

### Task 8: state.js に settings.pin ＋ schema v3

**Files:**
- Modify: `js/state.js`
- Test: `tests/state-v3.test.mjs`

**Interfaces:**
- Produces: `defaultState()` に `settings: { pin: null }`、`version: 3`。`load()` は `version===3` のみ受理(それ以外はdefaultStateへ)。既存の `SCHEMA_VERSION` 定数を 3 に更新。

- [ ] **Step 1: 失敗テスト** — `tests/state-v3.test.mjs`

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultState, load } from "../js/state.js";

function mem() { const m = new Map(); return { getItem: (k)=>m.has(k)?m.get(k):null, setItem: (k,v)=>m.set(k,v) }; }

test("defaultState は settings.pin=null・version3", () => {
  const s = defaultState();
  assert.equal(s.version, 3);
  assert.deepEqual(s.settings, { pin: null });
});
test("v2データはv3デフォルトにリセット", () => {
  const st = mem();
  st.setItem("manabi-quest-v1", JSON.stringify({ version: 2, profiles: [], progress: {}, attempts: [] }));
  assert.equal(load(st).version, 3);
});
```

- [ ] **Step 2: 失敗確認** — Run: `npm test` / Expected: FAIL
- [ ] **Step 3: 実装** — `js/state.js`: `const SCHEMA_VERSION = 3;`、`defaultState` の返り値に `settings: { pin: null },` を追加(profiles/progress/attemptsはそのまま)。
- [ ] **Step 4: 成功確認** — Run: `npm test` / Expected: PASS(既存state.testはversion更新で一部要修正。`s.version` を3に期待するよう既存テストも更新)
- [ ] **Step 5: 既存 state.test.mjs の version 期待値を 3 に更新**(2箇所: 空/壊れJSON)
- [ ] **Step 6: コミット** — `feat: settings.pin と schema v3`

---

### Task 9: 親ページ(隠し入口・PIN・履歴・苦手Top5・書き出し)

**Files:**
- Modify: `js/app.js`, `css/style.css`, `index.html`
- Test: `tests/weakness-top.test.mjs`(苦手Top5の集計関数)

**Interfaces:**
- Consumes: `state`(profiles/progress/attempts/settings), `weightBySkill`は使わず専用集計
- Produces:
  - 集計関数 `weaknessTop(attempts, profileId, n=5) -> [{skillTag, rate, tries}]`(正答率昇順、tries>0のみ)を `js/weakness.js` に追加。
  - 親ページUI: プロフィール画面隅の⚙長押し→PIN→ダッシュボード。

- [ ] **Step 1: 失敗テスト(集計)** — `tests/weakness-top.test.mjs`

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { weaknessTop } from "../js/weakness.js";

const A = (skillTag, c, n) => Array.from({ length: n }, () => ({ profileId: "p1", skillTag, correct: c, date: "x" }));

test("正答率の低い順・tries付き・実績あるものだけ", () => {
  const attempts = [...A("a", false, 4), ...A("a", true, 1), ...A("b", true, 5)];
  const top = weaknessTop(attempts, "p1", 5);
  assert.equal(top[0].skillTag, "a");
  assert.ok(Math.abs(top[0].rate - 0.2) < 1e-9);
  assert.equal(top[0].tries, 5);
  assert.equal(top.find((t) => t.skillTag === "b").rate, 1);
});
test("他プロフィール除外・n件まで", () => {
  const attempts = [{ profileId: "p2", skillTag: "a", correct: false, date: "x" }];
  assert.deepEqual(weaknessTop(attempts, "p1", 5), []);
});
```

- [ ] **Step 2: 失敗確認** — Run: `npm test` / Expected: FAIL
- [ ] **Step 3: weaknessTop 実装** — `js/weakness.js` に追記:

```js
export function weaknessTop(attempts, profileId, n = 5) {
  const mine = attempts.filter((a) => a.profileId === profileId);
  const by = {};
  for (const a of mine) {
    (by[a.skillTag] ??= { skillTag: a.skillTag, tries: 0, ok: 0 });
    by[a.skillTag].tries++;
    if (a.correct) by[a.skillTag].ok++;
  }
  return Object.values(by)
    .map((v) => ({ skillTag: v.skillTag, rate: v.ok / v.tries, tries: v.tries }))
    .sort((x, y) => x.rate - y.rate)
    .slice(0, n);
}
```

- [ ] **Step 4: 成功確認** — Run: `npm test` / Expected: PASS

- [ ] **Step 5: 親ページ画面をHTMLに追加** — `index.html` に `<section id="screen-parent" class="screen hidden"></section>`。

- [ ] **Step 6: 隠し入口＋PIN＋ダッシュボードを app.js に実装**

```js
// プロフィール画面の隅に⚙を出し、長押しでPINへ
function attachParentGear() {
  const gear = document.createElement("div");
  gear.textContent = "⚙";
  gear.className = "parent-gear";
  let timer = null;
  const start = () => { timer = setTimeout(openParentGate, 900); };
  const cancel = () => clearTimeout(timer);
  gear.addEventListener("touchstart", start);
  gear.addEventListener("mousedown", start);
  ["touchend","touchcancel","mouseup","mouseleave"].forEach((e) => gear.addEventListener(e, cancel));
  $("#screen-profile").appendChild(gear);
}

function openParentGate() {
  const pin = app.state.settings.pin;
  $("#screen-parent").innerHTML = pin
    ? `<h1>おうちの人ページ</h1><div class="card">PINを いれてください</div>
       <input id="pin-in" class="pin" inputmode="numeric" maxlength="4" />
       <button id="pin-ok">かくにん</button><button id="pin-cancel" class="secondary">もどる</button>
       <div id="pin-msg"></div>`
    : `<h1>おうちの人ページ</h1><div class="card">はじめに 4けたのPINを きめてください</div>
       <input id="pin-set" class="pin" inputmode="numeric" maxlength="4" />
       <button id="pin-save">せってい</button><button id="pin-cancel" class="secondary">もどる</button>`;
  show("#screen-parent");
  $("#pin-cancel").addEventListener("click", renderProfile);
  if (pin) {
    $("#pin-ok").addEventListener("click", () => {
      if ($("#pin-in").value === pin) renderParentDash();
      else $("#pin-msg").textContent = "PINが ちがいます";
    });
  } else {
    $("#pin-save").addEventListener("click", () => {
      const v = $("#pin-set").value;
      if (/^\d{4}$/.test(v)) { app.state.settings.pin = v; save(localStorage, app.state); renderParentDash(); }
    });
  }
}

function renderParentDash() {
  const rows = app.state.profiles.map((p) => {
    const pr = app.state.progress[p.id];
    const top = weaknessTop(app.state.attempts, p.id, 5)
      .map((t) => `${t.skillTag} ${Math.round(t.rate * 100)}%(${t.tries})`).join("<br>") || "きろく なし";
    return `<div class="card"><b>${p.avatar} ${p.nickname}</b>
      <div>れんぞく ${pr.streak}日 / セッション ${pr.sessions} / ずかん ${pr.monsters.length}</div>
      <div style="margin-top:6px"><b>にがて トップ5</b><br>${top}</div></div>`;
  }).join("");
  $("#screen-parent").innerHTML = `
    <h1>おうちの人ページ</h1>${rows}
    <button id="p-export">きろくを 書き出す</button>
    <textarea id="p-export-area" class="export" readonly></textarea>
    <button id="p-pin" class="secondary">PINを かえる</button>
    <button id="p-reset" class="secondary">きろくを リセット</button>
    <button id="p-back" class="secondary">もどる</button>`;
  $("#p-export").addEventListener("click", () => {
    $("#p-export-area").value = JSON.stringify(app.state, null, 2);
    $("#p-export-area").select();
  });
  $("#p-pin").addEventListener("click", () => { app.state.settings.pin = null; save(localStorage, app.state); openParentGate(); });
  $("#p-reset").addEventListener("click", () => {
    if (confirm("すべての きろくを けします。よいですか?")) {
      localStorage.removeItem("manabi-quest-v1");
      app.state = load(localStorage); renderProfile();
    }
  });
  $("#p-back").addEventListener("click", renderProfile);
  show("#screen-parent");
}
```
`renderProfile` の最後に `attachParentGear();` を呼ぶ。`weaknessTop` を import に追加。

- [ ] **Step 7: 親ページCSS** — `css/style.css`:
```css
.parent-gear { position: fixed; right: 10px; bottom: 10px; font-size: 1.6rem; opacity: .35; padding: 8px; }
.pin { font-size: 2rem; letter-spacing: .5em; text-align: center; padding: 10px; border-radius: 12px; border: none; width: 100%; }
.export { width: 100%; height: 140px; font-size: .8rem; }
#screen-parent { color: #fff; }
```

- [ ] **Step 8: ブラウザ手動確認** — ⚙長押し→PIN設定→ダッシュボードに子別履歴・苦手Top5表示→書き出しでJSON→PIN変更→リセット確認。playwright/chrome-devtoolsで確認しスクショ。
- [ ] **Step 9: コミット** — `feat: 親ページ(PIN・履歴・苦手Top5・書き出し・リセット)`

---

### Task 10: 意味・部首・筆順(1・2年から)

**Files:**
- Modify: `data/kanji/g1.js`, `data/kanji/g2.js`(radical/strokes追加), `js/kanji-quiz.js`(出題追加)
- Test: `tests/kanji-quiz-extra.test.mjs`

**Interfaces:**
- Produces: g1・g2の各字に `radical`(部首文字)と `strokes`(総画数・整数)を追加。`kanjiSkills(grade)` に `kanji-mean-g<N>`,`kanji-radical-g<N>`,`kanji-stroke-g<N>` を追加(g1・g2のみ。g3・g4は読み書きのみのまま)。`makeKanjiQuestion` が新形式を生成。

**授業:** radical/strokes/意味は**辞書照合**。まずg1(80)・g2(160)に付与。3・4年は後続(今回はスキルに含めない)。

- [ ] **Step 1: 失敗テスト** — `tests/kanji-quiz-extra.test.mjs`

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { makeKanjiQuestion, kanjiSkills } from "../js/kanji-quiz.js";
import { KANJI_G1 } from "../data/kanji/g1.js";

test("g1データに radical と strokes がある", () => {
  for (const k of KANJI_G1) {
    assert.ok(k.radical && [...k.radical].length >= 1, k.kanji);
    assert.ok(Number.isInteger(k.strokes) && k.strokes >= 1, k.kanji);
  }
});
test("g1のスキルに意味・部首・筆順が含まれる", () => {
  const s = kanjiSkills(1);
  for (const t of ["kanji-mean-g1", "kanji-radical-g1", "kanji-stroke-g1"]) assert.ok(s.includes(t));
});
test("意味問題: choices4つ・正解含む", () => {
  for (let i = 0; i < 200; i++) {
    const q = makeKanjiQuestion("kanji-mean-g1");
    assert.equal(q.choices.length, 4);
    assert.ok(q.choices.includes(q.answer));
  }
});
test("部首・筆順問題: choices4つ・正解含む", () => {
  for (const tag of ["kanji-radical-g1", "kanji-stroke-g1"]) {
    for (let i = 0; i < 200; i++) {
      const q = makeKanjiQuestion(tag);
      assert.equal(q.choices.length, 4);
      assert.ok(q.choices.includes(q.answer));
    }
  }
});
```

- [ ] **Step 2: 失敗確認** — Run: `npm test` / Expected: FAIL
- [ ] **Step 3: g1・g2 に radical/strokes 付与**(Write/Editで各字に追記。辞書照合)
- [ ] **Step 4: kanji-quiz.js 拡張** — `kanjiSkills` を学年で分岐:
```js
export function kanjiSkills(grade) {
  const base = [`kanji-read-g${grade}`, `kanji-write-g${grade}`];
  if (grade === 1 || grade === 2)
    return [...base, `kanji-mean-g${grade}`, `kanji-radical-g${grade}`, `kanji-stroke-g${grade}`];
  return base;
}
```
`makeKanjiQuestion` の正規表現を `^kanji-(read|write|mean|radical|stroke)-g(\d)$` に拡張し、各種の出題を追加:
- mean: text=「「〈漢字〉」の いみは?」, 正解=meaning, ダミー=同学年他字のmeaning3つ
- radical: text=「「〈漢字〉」の ぶしゅは?」, 正解=radical, ダミー=同学年他字のradical(重複除去)3つ
- stroke: text=「「〈漢字〉」は 何画?」, 正解=String(strokes), ダミー=strokes±1,±2等の近い数を3つ(重複なし・正解と異なる)

- [ ] **Step 5: 成功確認 & 出典照合レビュー** — `npm test` 全通過。radical/strokes/meaningを辞書照合レビュー。
- [ ] **Step 6: ブラウザ確認** — 漢字バトルで意味・部首・筆順が出る(g1/g2)。
- [ ] **Step 7: コミット** — `feat: 漢字の意味・部首・筆順(1・2年)`

---

### Task 11: PWA更新・README・公開

**Files:**
- Modify: `sw.js`(ASSETS追加・CACHE→v1.3.0), `README.md`
- Deploy: git push(GitHub Pages自動反映)

- [ ] **Step 1: sw.js 更新** — ASSETS に漢字関連を追加:
```
"./data/kanji/g1.js","./data/kanji/g2.js","./data/kanji/g3.js","./data/kanji/g4.js",
"./js/kanji-quiz.js","./js/session.js","./js/weakness.js",
```
`CACHE` を `"manabi-quest-v1.3.0"` に更新。

- [ ] **Step 2: README 更新** — 第2弾の内容(漢字・親ページ・苦手調整)を追記。

- [ ] **Step 3: 全テスト & ブラウザ最終確認** — `npm test` 全通過。教科えらび・漢字全形式(g1/g2)・苦手調整・親ページをブラウザ確認。オフライン(SW)でも漢字が動く。

- [ ] **Step 4: 公開** — `git push`。数分後 `https://takagifamilyclinic-source.github.io/manabi-quest/` で漢字が使えることをWebFetch/ブラウザで確認(200＋実動作)。

- [ ] **Step 5: コミット & 最終報告** — README等をコミット・push。公開URLとiPad手順を案内。

---

## Self-Review結果

- **スペック照合**: 教科選択(Task7)/漢字データ読み書き全642(Task2,3)/kanji-quiz(Task4)/苦手調整(Task5,6)/親ページPIN・苦手Top5・書き出し(Task9)/schema v3(Task8)/意味・部首・筆順1-2年(Task10)/PWA・公開(Task11)。設計の全項目をカバー。
- **型整合**: 質問オブジェクト `{subject?,skillTag,text,choices?,answer,explanation}`、`buildSession(grade,subject,opts)`、`weightBySkill(skills,attempts,profileId,opts?)`、`weaknessTop(attempts,profileId,n)`、`makeKanjiQuestion(skillTag,rng)`、`kanjiSkills(grade)` は各タスクで一貫。`answer` の choices分岐(Task1)が漢字文字列判定(Task7 submitAnswer)と整合。
- **プレースホルダ**: ロジックは完全コード。漢字元データ(642字)は分量のため plan にはg1配当字集合と構造・字数・検証・出典照合手順を明記し、実データは実装時に作成(データ作成タスクとして妥当)。
- **既知の注意**: `math-gen.js` の `generateSession` は session.js 導入後は未使用になりうる。Task6で import 整理。既存 state.test の version 期待値更新(Task8 Step5)を忘れない。
