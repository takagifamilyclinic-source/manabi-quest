# 第6弾(その1) 英語パック 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 第3の教科「えいご」を全学年に追加する — 学年60語×4=240語、英→日/日→英の4択、🔊読み上げ（iPad内蔵音声）、既存のバトル・苦手調整に統合。あわせてバッジの算数カウントをプレフィックス方式に修正。

**Architecture:** kanji-quiz.js と同じ流儀の純関数 `js/english-quiz.js`＋学年別データ `data/english/g*.js`。共有ヘルパ（pick/sampleUnique/shuffle）を `js/quiz-util.js` に抽出して kanji/english（次弾の理社も）で共用。schema変更なし。

**Tech Stack:** buildless バニラJS・`node --test`・speechSynthesis（Web標準）・PWA・GitHub Pages。

**設計書:** `docs/specs/2026-07-10-phase6a-english-pack-design.md`

## Global Constraints

- **課金ゼロ**：音声はiPad内蔵 `speechSynthesis` のみ（音声ファイル・外部API・画像なし）。GitHub無料枠のみ。
- **事実データは捏造しない**：単語の意味・カナは不確かなら辞書（Web）で確認してから収録。Task 6 で抜き取り照合レビュー必須。
- 依存追加禁止。`npm test` は各タスク完了時に全件グリーン（既存116件を壊さない）。
- **`sw.js` は最後に ASSETS へ `./js/quiz-util.js`・`./js/english-quiz.js`・`./data/english/g1.js`〜`g4.js` を追加し CACHE を v1.7.0 へ**（Task 7）。
- schema変更なし（成績はskillTagキーで自動追加）。既存ユーザーの進捗を消さない。
- **日→英（eng-word）の問題に `speak` を付けない**（読み上げが正解をバラすため）。
- 作業ブランチ `feature/phase6a-english`。マージ・push・live確認はコントローラが最終レビュー後に実施。

## 前提知識（実装者向け）

- 出題モジュールの流儀は `js/kanji-quiz.js` 参照（skillTag正規表現→純関数で4択生成）。
- 教科分岐は `js/session.js` の `skillsFor` / `make`（現在 math/kanji の2教科）。
- バッジの教科カウントは `js/badges.js` の `correctCount(attempts, profileId, isKanji)` —
  現状「kanji-以外＝算数」なので eng- を足すと算数バッジに算入されるバグになる（Task 4 で修正）。
- データ形式: `{ word: "apple", kana: "アップル", meaning: "りんご", category: "くだもの" }`。
  word は小文字英字（スペース・アポストロフィ可）。kana はカタカナ。meaning はこども向け短文（4択の選択肢文字列）。
- `npm test` = `node --test tests/`。

---

### Task 1: 英語データ g1・g2（各60語）＋妥当性テスト（TDD）

**Files:**
- Create: `data/english/g1.js` / `data/english/g2.js`
- Test: `tests/english-data.test.mjs`（新規・全学年ぶんの器をこのタスクで作る）

**Interfaces:**
- Produces: `export const ENGLISH_G1 = [...]`（60語）/ `ENGLISH_G2`（60語）。Task 3 の english-quiz.js が import。

- [ ] **Step 1: 作業ブランチ作成**

```bash
cd /d/Desktop-Archive/manabi-quest
git checkout -b feature/phase6a-english
```

- [ ] **Step 2: 失敗するテストを書く**

`tests/english-data.test.mjs` を作成（g3/g4のテストは Task 2 で追記するため、このタスクでは g1/g2 のみ）:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { ENGLISH_G1 } from "../data/english/g1.js";
import { ENGLISH_G2 } from "../data/english/g2.js";

export function validateGrade(list, label) {
  assert.equal(list.length, 60, `${label} は60語`);
  assert.equal(new Set(list.map((e) => e.word)).size, 60, `${label} word重複`);
  assert.equal(new Set(list.map((e) => e.meaning)).size, 60, `${label} meaning重複`);
  for (const e of list) {
    assert.match(e.word, /^[a-z][a-z' ]*$/, `${label} word形式: ${e.word}`);
    assert.match(e.kana, /^[ァ-ヶー・\s]+$/u, `${label} kana形式: ${e.word}=${e.kana}`);
    assert.ok(e.meaning && e.meaning.length >= 1, `${label} meaning空: ${e.word}`);
    assert.ok(e.category && e.category.length >= 1, `${label} category空: ${e.word}`);
  }
}

test("英語g1: 60語・形式・重複なし", () => validateGrade(ENGLISH_G1, "g1"));
test("英語g2: 60語・形式・重複なし", () => validateGrade(ENGLISH_G2, "g2"));
```

- [ ] **Step 3: テストが失敗することを確認**

```bash
cd /d/Desktop-Archive/manabi-quest && node --test tests/english-data.test.mjs
```
Expected: FAIL（データファイルが無い）。

- [ ] **Step 4: g1 データ作成（下記の60語を**この集合のまま**収録・増減禁止）**

`data/english/g1.js`。カテゴリと語は以下（意味・カナは辞書で確認して付ける。例: `{ word: "red", kana: "レッド", meaning: "あか", category: "いろ" }`）:
- いろ(10): red, blue, yellow, green, black, white, pink, purple, brown, gray
- かず(10): one, two, three, four, five, six, seven, eight, nine, ten
- どうぶつ(15): dog, cat, bird, fish, rabbit, bear, lion, elephant, monkey, mouse, horse, cow, pig, tiger, panda
- くだもの(10): apple, banana, grape, peach, melon, strawberry, cherry, lemon, pineapple, kiwi
  （orange は「いろ／くだもの」の二義で紛らわしいため意図的に除外）
- あいさつ・きほん(15): hello, goodbye, good morning, good night, thank you, sorry, please, yes, no, friend, school, teacher, name, boy, girl

- [ ] **Step 5: g2 データ作成（テーマと語数指定・語の選定は定番の基礎語彙から）**

`data/english/g2.js`。テーマ内で日常的な基礎語を選ぶ（不確かな語は辞書確認）:
- たべもの(15)・のみもの(5)・みのまわりのもの(15)・かぞく(10)・てんき/しぜん(15)
- g1 と重複する word を入れない（Task 2 の横断テストで機械検証される）。

- [ ] **Step 6: テスト通過と全体グリーンを確認**

```bash
cd /d/Desktop-Archive/manabi-quest && node --test tests/english-data.test.mjs && npm test
```
Expected: すべてPASS。

- [ ] **Step 7: コミット**

```bash
git add data/english tests/english-data.test.mjs
git commit -m "feat: 英語元データ1・2年 各60語(辞書確認済み)"
```

---

### Task 2: 英語データ g3・g4＋全240語横断テスト（TDD）

**Files:**
- Create: `data/english/g3.js` / `data/english/g4.js`
- Modify: `tests/english-data.test.mjs`（g3/g4＋横断テスト追記）

**Interfaces:**
- Produces: `ENGLISH_G3` / `ENGLISH_G4`（各60語）。

- [ ] **Step 1: テスト追記（失敗するテスト）**

`tests/english-data.test.mjs` に追記:

```js
import { ENGLISH_G3 } from "../data/english/g3.js";
import { ENGLISH_G4 } from "../data/english/g4.js";

test("英語g3: 60語・形式・重複なし", () => validateGrade(ENGLISH_G3, "g3"));
test("英語g4: 60語・形式・重複なし", () => validateGrade(ENGLISH_G4, "g4"));

test("全240語: 学年をまたいで word がユニーク", () => {
  const all = [...ENGLISH_G1, ...ENGLISH_G2, ...ENGLISH_G3, ...ENGLISH_G4];
  assert.equal(all.length, 240);
  const dup = all
    .map((e) => e.word)
    .filter((w, i, a) => a.indexOf(w) !== i);
  assert.deepEqual(dup, [], `学年間で重複: ${dup.join(",")}`);
});
```

- [ ] **Step 2: 失敗確認**

```bash
cd /d/Desktop-Archive/manabi-quest && node --test tests/english-data.test.mjs
```
Expected: FAIL（g3/g4が無い）。

- [ ] **Step 3: g3/g4 データ作成（テーマと語数指定）**

- g3（学校の外国語活動の定番語彙に寄せる）: ぶんぼうぐ(10)・スポーツ(10)・ようび(7: monday〜sunday)・つき(12: january〜december)・からだ(12)・どうさ(9)
- g4: きょうか(10)・まち/ばしょ(15)・どうさのことば(15)・いちにち/じかん(10)・きせつ/ぎょうじ(10)
- 既収録学年と word 重複禁止（横断テストが機械検証）。不確かな語・意味は辞書確認。

- [ ] **Step 4: テスト通過と全体グリーン**

```bash
cd /d/Desktop-Archive/manabi-quest && node --test tests/english-data.test.mjs && npm test
```
Expected: すべてPASS。

- [ ] **Step 5: コミット**

```bash
git add data/english tests/english-data.test.mjs
git commit -m "feat: 英語元データ3・4年 各60語＋全240語横断テスト"
```

---

### Task 3: quiz-util抽出＋english-quiz.js＋session統合（TDD）

**Files:**
- Create: `js/quiz-util.js`（pick/sampleUnique/shuffle を kanji-quiz.js から抽出）
- Create: `js/english-quiz.js`
- Modify: `js/kanji-quiz.js`（自前ヘルパを quiz-util の import に置換。**挙動不変**）
- Modify: `js/session.js`（english 分岐追加）
- Test: `tests/english-quiz.test.mjs`（新規）

**Interfaces:**
- Produces: `js/quiz-util.js` が `pick(rng, arr)` / `sampleUnique(rng, arr, n, excludeSet)` / `shuffle(rng, arr)` をexport（実装は kanji-quiz.js 内の同名関数の現行コードをそのまま移す）。
- Produces: `englishSkills(grade)` → `["eng-mean-g<g>", "eng-word-g<g>"]`、
  `makeEnglishQuestion(skillTag, rng)` → `{subject:"english", skillTag, text, choices[4], answer, explanation, speak?}`（speak は eng-mean のみ）。
- Produces: `buildSession(grade, "english", opts)` が動く。

- [ ] **Step 1: 失敗するテストを書く**

`tests/english-quiz.test.mjs` を作成:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { englishSkills, makeEnglishQuestion } from "../js/english-quiz.js";
import { buildSession } from "../js/session.js";

test("englishSkills は全学年で mean/word の2形式", () => {
  for (const g of [1, 2, 3, 4])
    assert.deepEqual(englishSkills(g), [`eng-mean-g${g}`, `eng-word-g${g}`]);
});

test("英→日: 4択・正解含有・重複なし・speak=出題語・1,2年はカナ併記", () => {
  for (const g of [1, 2, 3, 4]) {
    for (let i = 0; i < 300; i++) {
      const q = makeEnglishQuestion(`eng-mean-g${g}`);
      assert.equal(q.subject, "english");
      assert.equal(q.choices.length, 4);
      assert.ok(q.choices.includes(q.answer));
      assert.equal(new Set(q.choices).size, 4);
      assert.ok(q.speak && q.text.startsWith(q.speak), `speak=${q.speak} text=${q.text}`);
      if (g <= 2) assert.match(q.text, /（[ァ-ヶー・\s]+）/u, `g${g} カナ併記なし: ${q.text}`);
      else assert.doesNotMatch(q.text, /（[ァ-ヶー・\s]+）/u, `g${g} にカナ併記: ${q.text}`);
    }
  }
});

test("日→英: 4択・正解含有・重複なし・speakなし", () => {
  for (const g of [1, 2, 3, 4]) {
    for (let i = 0; i < 300; i++) {
      const q = makeEnglishQuestion(`eng-word-g${g}`);
      assert.equal(q.choices.length, 4);
      assert.ok(q.choices.includes(q.answer));
      assert.equal(new Set(q.choices).size, 4);
      assert.equal(q.speak, undefined, "日→英にspeakを付けない(正解バレ防止)");
    }
  }
});

test("buildSession が english を受け付け10問返す", () => {
  const qs = buildSession(3, "english", { count: 10 });
  assert.equal(qs.length, 10);
  for (const q of qs) assert.equal(q.subject, "english");
});

test("未知のskillTag/学年はthrow", () => {
  assert.throws(() => makeEnglishQuestion("eng-mean-g9"));
  assert.throws(() => makeEnglishQuestion("eng-foo-g1"));
});
```

- [ ] **Step 2: 失敗確認**

```bash
cd /d/Desktop-Archive/manabi-quest && node --test tests/english-quiz.test.mjs
```
Expected: FAIL（english-quiz.js が無い）。

- [ ] **Step 3: js/quiz-util.js を作成（kanji-quiz.jsから移動・コード不変）**

```js
// 4択ビルダ共通ヘルパ(純粋)。kanji-quiz / english-quiz(以後の教科も)で共用。
export function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

export function sampleUnique(rng, arr, n, exclude) {
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

export function shuffle(rng, arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
```

`js/kanji-quiz.js`: 自前の `pick`/`sampleUnique`/`shuffle` の関数定義（3つ）を削除し、
`import { pick, sampleUnique, shuffle } from "./quiz-util.js";` に置換（他は一切変更しない。RADICAL_FAMILIES等は触らない）。

- [ ] **Step 4: js/english-quiz.js を作成**

```js
// 英語の出題ビルダ(純粋)。英→日(mean)・日→英(word)を同一元データから生成。
import { ENGLISH_G1 } from "../data/english/g1.js";
import { ENGLISH_G2 } from "../data/english/g2.js";
import { ENGLISH_G3 } from "../data/english/g3.js";
import { ENGLISH_G4 } from "../data/english/g4.js";
import { pick, sampleUnique, shuffle } from "./quiz-util.js";

export const ENGLISH_BY_GRADE = {
  1: ENGLISH_G1,
  2: ENGLISH_G2,
  3: ENGLISH_G3,
  4: ENGLISH_G4,
};

export function englishSkills(grade) {
  return [`eng-mean-g${grade}`, `eng-word-g${grade}`];
}

export function makeEnglishQuestion(skillTag, rng = Math.random) {
  const m = skillTag.match(/^eng-(mean|word)-g(\d)$/);
  if (!m) throw new Error(`unknown english skill: ${skillTag}`);
  const kind = m[1];
  const grade = Number(m[2]);
  const list = ENGLISH_BY_GRADE[grade];
  if (!list) throw new Error(`unknown grade: ${grade}`);
  const target = pick(rng, list);
  const kanaNote = grade <= 2 ? `（${target.kana}）` : "";

  if (kind === "mean") {
    const answer = target.meaning;
    const others = list
      .filter((e) => e.word !== target.word)
      .map((e) => e.meaning);
    const dummies = sampleUnique(rng, others, 3, new Set([answer]));
    return {
      subject: "english",
      skillTag,
      text: `${target.word}${kanaNote} の いみは どれ?`,
      choices: shuffle(rng, [answer, ...dummies]),
      answer,
      speak: target.word,
      explanation: `${target.word}（${target.kana}）= ${target.meaning}`,
    };
  }

  const answer = target.word;
  const others = list
    .filter((e) => e.word !== target.word)
    .map((e) => e.word);
  const dummies = sampleUnique(rng, others, 3, new Set([answer]));
  return {
    subject: "english",
    skillTag,
    text: `「${target.meaning}」を えいごで いうと?`,
    choices: shuffle(rng, [answer, ...dummies]),
    answer,
    explanation: `${target.meaning} = ${target.word}（${target.kana}）`,
  };
}
```

- [ ] **Step 5: js/session.js に english 分岐を追加**

import に追加:
```js
import { englishSkills, makeEnglishQuestion } from "./english-quiz.js";
```
`skillsFor` の kanji 分岐の後に:
```js
  if (subject === "english") return englishSkills(grade);
```
`make` を3教科対応に置換:
```js
  const make = (skill) => {
    if (subject === "math") return generateQuestion(skill, rng);
    if (subject === "english") return makeEnglishQuestion(skill, rng);
    return makeKanjiQuestion(skill, rng);
  };
```

- [ ] **Step 6: テスト通過と全体グリーン（kanji回帰含む）**

```bash
cd /d/Desktop-Archive/manabi-quest && node --test tests/english-quiz.test.mjs tests/kanji-quiz.test.mjs tests/kanji-quiz-extra.test.mjs tests/kanji-quiz-family.test.mjs && npm test
```
Expected: すべてPASS（quiz-util抽出で漢字系テストが1件も落ちないこと）。

- [ ] **Step 7: コミット**

```bash
git add js/quiz-util.js js/english-quiz.js js/kanji-quiz.js js/session.js tests/english-quiz.test.mjs
git commit -m "feat: 英語出題(英日/日英4択・speak付与)＋quiz-util共通化＋session統合"
```

---

### Task 4: バッジの教科判定をプレフィックス方式に修正（TDD）

**Files:**
- Modify: `js/badges.js`（subjectOfTag導入・correctCountの引数を subject 文字列に）
- Modify: `tests/badges.test.mjs`（回帰テスト追加）

**Interfaces:**
- Produces: `subjectOfTag(skillTag): "kanji"|"english"|"science"|"social"|"math"`（named export）。
- BADGES の math-*/kanji-* の `cur` は subjectOfTag ベースでカウント（既存の獲得状況は不変）。

- [ ] **Step 1: 回帰テストを追加（失敗するテスト）**

`tests/badges.test.mjs` に追記:

```js
import { subjectOfTag } from "../js/badges.js";

test("subjectOfTag: プレフィックスで教科判定", () => {
  assert.equal(subjectOfTag("kanji-read-g3"), "kanji");
  assert.equal(subjectOfTag("eng-mean-g1"), "english");
  assert.equal(subjectOfTag("sci-x-g3"), "science");
  assert.equal(subjectOfTag("soc-x-g4"), "social");
  assert.equal(subjectOfTag("mul-1"), "math");
  assert.equal(subjectOfTag("add-2digit"), "math");
});

test("英語の正解は算数・漢字バッジに算入されない", () => {
  const attempts = [];
  for (let i = 0; i < 150; i++)
    attempts.push({ profileId: "p1", skillTag: "eng-mean-g1", correct: true, date: "2026-07-10" });
  const e = earnedBadges(badgeContext(makeState({}, attempts), "p1", IDS));
  assert.ok(!e.has("math-100"), "eng-がmath-100に算入された");
  assert.ok(!e.has("kanji-100"));
});
```

- [ ] **Step 2: 失敗確認**

```bash
cd /d/Desktop-Archive/manabi-quest && node --test tests/badges.test.mjs
```
Expected: FAIL（subjectOfTag未定義・eng-がmathに算入）。

- [ ] **Step 3: js/badges.js を修正**

`correctCount` と冒頭部を置換:
```js
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
```
BADGES の math-100/math-500 の `cur` を `(c) => correctCount(c.attempts, c.profileId, "math")`、
kanji-100/kanji-500 を `(c) => correctCount(c.attempts, c.profileId, "kanji")` に置換。

- [ ] **Step 4: テスト通過と全体グリーン**

```bash
cd /d/Desktop-Archive/manabi-quest && npm test
```
Expected: 全件PASS（既存の教科バッジテストも変更なしで通る＝既存挙動不変の証明）。

- [ ] **Step 5: コミット**

```bash
git add js/badges.js tests/badges.test.mjs
git commit -m "fix: バッジ教科判定をプレフィックス方式に(英語が算数に算入されるのを防止)"
```

---

### Task 5: UI（えいごボタン・🔊読み上げ）＋ブラウザ検証

**Files:**
- Modify: `js/app.js`（renderSubject・renderQuestion）
- Modify: `css/style.css`（🔊ボタン）

**Interfaces:**
- Consumes: `buildSession(grade, "english", ...)`（Task 3）・問題の `speak` フィールド。

- [ ] **Step 1: renderSubject に「えいご」ボタン追加**

`js/app.js` の `renderSubject()` を置換:
```js
function renderSubject() {
  $("#screen-subject").innerHTML = `
    <h1>きょうか を えらぶ</h1>
    <button id="sub-math">➗ さんすう</button>
    <button id="sub-kanji" class="secondary">✏️ かんじ</button>
    <button id="sub-eng" class="secondary">🗣️ えいご</button>
    <button id="sub-back" class="secondary">もどる</button>
  `;
  $("#sub-math").addEventListener("click", () => startBattle("math"));
  $("#sub-kanji").addEventListener("click", () => startBattle("kanji"));
  $("#sub-eng").addEventListener("click", () => startBattle("english"));
  $("#sub-back").addEventListener("click", renderHome);
  show("#screen-subject");
}
```

- [ ] **Step 2: renderQuestion に🔊ボタン**

`renderQuestion()` の `qtext` 行を置換し、リスナーを追加:
```js
  const canSpeak = qn.speak && "speechSynthesis" in window;
```
（`$("#screen-battle").innerHTML = ...` 内）
```js
    <div class="qtext">${qn.text}${canSpeak ? ` <button id="btn-speak" class="speak">🔊</button>` : ""}</div>
```
（innerHTML代入後のリスナー登録部に）
```js
  if (canSpeak)
    $("#btn-speak").addEventListener("click", () => {
      const u = new SpeechSynthesisUtterance(qn.speak);
      u.lang = "en-US";
      u.rate = 0.9;
      const en = speechSynthesis
        .getVoices()
        .find((v) => v.lang.startsWith("en"));
      if (en) u.voice = en;
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    });
```

- [ ] **Step 3: CSS追加（style.css末尾）**

```css
/* ===== 英語 読み上げ(第6弾) ===== */
button.speak {
  width: auto;
  display: inline-block;
  font-size: 18px;
  padding: 4px 14px;
  margin: 0 0 0 6px;
  vertical-align: middle;
  border-radius: 999px;
}
```
（既存の button 全幅スタイルがある場合は `width:auto` 等で打ち消す。見た目は既存流儀に合わせ微調整可。）

- [ ] **Step 4: 全体テスト＋ブラウザ検証（必須）**

```bash
cd /d/Desktop-Archive/manabi-quest && npm test
```
`python -m http.server 8123` で配信し chrome-devtools MCP で:
1. 教科えらびに「🗣️ えいご」が出る（全学年）。
2. えいごバトル開始→ 英→日の問題で 🔊 が表示され、日→英では出ない（10問中に両形式が出るまで確認。出なければもう1周）。
3. 🔊 クリックでエラーが出ない（コンソール確認。ヘッドレスでは無音でよい）。
4. かんじ・さんすうのバトルが従来どおり動く（回帰）。
検証後サーバ停止。観察内容をレポートへ。

- [ ] **Step 5: コミット**

```bash
git add js/app.js css/style.css
git commit -m "feat: 教科えらびに えいご＋問題文の🔊読み上げ(speechSynthesis)"
```

---

### Task 6: 抜き取り出典照合レビュー（レビューゲート・必須）

**Files:**
- Modify（誤り発見時のみ）: `data/english/g*.js`

- [ ] **Step 1: 対象選定** — 240語からランダム30語（各学年7〜8語。node当てで選出）。
- [ ] **Step 2: Web辞書で照合** — 各語の意味（収録meaningが妥当な訳か）とkana（一般的なカタカナ表記か）を
  Web辞書（Weblio等 https://ejje.weblio.jp/content/<word> ）でWebFetchし1語ずつ確認。
  **自分の記憶だけでの判定禁止**（照合URLを記録）。「字 / 収録meaning / 収録kana / 辞書での意味 / 一致?」の表をレポートに書く。
- [ ] **Step 3: 不一致があれば修正** — 辞書優先で `data/english/g*.js` を修正し `npm test` 全件グリーン後:

```bash
git add data/english
git commit -m "fix: 出典照合レビュー指摘の英語の意味・カナを訂正(出典: Weblio)"
```
（不一致ゼロならコミット不要。）

---

### Task 7: sw v1.7.0・README・ヘッドレス検証

**Files:**
- Modify: `sw.js`（ASSETS 6行追加＋CACHE v1.7.0）
- Modify: `README.md`（第6弾その1）
- Create→Delete: `_verify.html`

- [ ] **Step 1: sw.js 更新** — CACHE を `manabi-quest-v1.7.0` に。ASSETS の `"./js/kanji-quiz.js",` の直後に:
```js
  "./js/quiz-util.js",
  "./js/english-quiz.js",
```
`"./data/kanji/g4.js",` の直後に:
```js
  "./data/english/g1.js",
  "./data/english/g2.js",
  "./data/english/g3.js",
  "./data/english/g4.js",
```
**他は変更しない。**

- [ ] **Step 2: README** — 第6弾その1（えいご240語・読み上げ・全学年）を既存の文体で追記。ロードマップから英語を消す。

- [ ] **Step 3: ヘッドレス検証** — `_verify.html`:
```html
<!doctype html><meta charset="utf-8"><div id="out"></div>
<script type="module">
  import { englishSkills, makeEnglishQuestion, ENGLISH_BY_GRADE } from "./js/english-quiz.js";
  const total = [1, 2, 3, 4].reduce((s, g) => s + ENGLISH_BY_GRADE[g].length, 0);
  const q1 = makeEnglishQuestion("eng-mean-g1");
  const q2 = makeEnglishQuestion("eng-word-g3");
  document.getElementById("out").textContent =
    `total=${total} skills-g2=${englishSkills(2).join(",")} mean-speak=${!!q1.speak} word-speak=${q2.speak === undefined} choices=${q1.choices.length}/${q2.choices.length}`;
</script>
```
```bash
cd /d/Desktop-Archive/manabi-quest && python -m http.server 8125 &
sleep 2
"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --dump-dom "http://127.0.0.1:8125/_verify.html" | grep -A2 'id="out"'
kill %1
rm _verify.html
```
Expected: `total=240 skills-g2=eng-mean-g2,eng-word-g2 mean-speak=true word-speak=true choices=4/4`。

- [ ] **Step 4: テスト→コミット**

```bash
cd /d/Desktop-Archive/manabi-quest && npm test
git add sw.js README.md
git commit -m "chore: sw v1.7.0(英語アセット追加)・README第6弾(その1)"
```

---

### Task 8: 最終レビュー→マージ→公開→クローズ（コントローラ実施）

- [ ] **Step 1: 最終全体レビュー**（ブランチ全体・Ready to merge判定・実iPadでの🔊確認を推奨事項として案内）
- [ ] **Step 2: masterマージ(--no-ff)→push→live確認**（sw v1.7.0・english-quiz.js・data/english/g1.js の3点）
- [ ] **Step 3: docs/進捗.md・メモリ更新→コミット→push**
