# 第5弾(その2) Claude連携手順書＋小粒改善2件 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ①部首問題のダミーから正解と同族の部首を除外 ②streak系バッジのロック文言改善 ③Claude連携の完全フローHTML手順書（公開ページ＋デスクトップ短縮）。

**Architecture:** ①は `js/kanji-quiz.js` に同族ファミリー表と `radicalFamily()` を追加しダミー抽出をフィルタ（TDD）。②は `js/app.js` の表示文言のみ。③は自己完結HTML1枚を `docs/` に置く（GitHub Pagesがそのまま配信・アプリのswキャッシュ対象外）。

**Tech Stack:** buildless バニラJS・`node --test`・静的HTML（外部読み込みなし）・GitHub Pages。

**設計書:** `docs/specs/2026-07-10-phase5b-guide-and-polish-design.md`

## Global Constraints

- **課金ゼロ**：静的HTML・emoji/CSSのみ（画像生成なし）。GitHub無料枠のみ。従量課金API不使用。
- 依存追加禁止。`npm test` は各タスク完了時に全件グリーン（既存114件を壊さない）。
- **`sw.js` は CACHE を v1.6.1 へ**（JS変更のため。ASSETS追加はなし — 手順書はアプリ外docs/でキャッシュ対象外）。
- 手順書の記述は**アプリの実UI文言を正**とする（「きろくを 書き出す」等。憶測で書かず `js/app.js` の実文言を確認して使う）。
- 作業ブランチ `feature/phase5b-polish`。マージ・push・live確認・デスクトップ短縮作成はコントローラが最終レビュー後に実施。

## 前提知識（実装者向け）

- 部首問題の生成は `js/kanji-quiz.js` の `makeKanjiQuestion` 内 `kind === "radical"` 分岐（78行目付近）。ダミーは同学年リストの他字の部首から `sampleUnique` で3つ抽出（現状は正解と完全一致のみ除外）。
- バッジ帳の未獲得セルは `js/app.js` の `renderBadges()` 内、`st.earned` が偽の分岐で「あと${st.target - st.current}${b.unit}」を表示している。
- 親ページの実フロー（手順書に書く内容の正）: プロフィール画面右下の⚙**長押し**→PIN入力（`openParentGate`）→親ページ→「きろくを 書き出す」ボタン（`#p-export`）→textareaにJSON表示＆自動全選択。
- `npm test` = `node --test tests/`。

---

### Task 1: 部首同族除外マップ（TDD）

**Files:**
- Modify: `js/kanji-quiz.js`（ファミリー表＋radicalFamily追加・radical分岐のダミーフィルタ）
- Test: `tests/kanji-quiz-family.test.mjs`（新規）

**Interfaces:**
- Produces: `radicalFamily(r: string): string`（named export。同族なら代表キー・非同族は自身を返す。テストとTask 2以降は使わない＝独立）。
- `makeKanjiQuestion("kanji-radical-g*")` のダミーに正解と同族の部首が含まれなくなる（4択・重複なしは不変）。

- [ ] **Step 1: 作業ブランチ作成**

```bash
cd /d/Desktop-Archive/manabi-quest
git checkout -b feature/phase5b-polish
```

- [ ] **Step 2: 失敗するテストを書く**

`tests/kanji-quiz-family.test.mjs` を作成:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { makeKanjiQuestion, radicalFamily } from "../js/kanji-quiz.js";

test("radicalFamily: 同族は同キー・非同族は自身を返す", () => {
  assert.equal(radicalFamily("氵"), radicalFamily("水"));
  assert.equal(radicalFamily("刂"), radicalFamily("刀"));
  assert.equal(radicalFamily("ネ"), radicalFamily("示"));
  assert.equal(radicalFamily("ツ"), radicalFamily("⺍"));
  assert.notEqual(radicalFamily("氵"), radicalFamily("火"));
  assert.equal(radicalFamily("口"), "口");
});

test("部首問題: 正解と同族の部首はダミーに並ばない(全学年・多数回)", () => {
  for (const g of [1, 2, 3, 4]) {
    for (let i = 0; i < 500; i++) {
      const q = makeKanjiQuestion(`kanji-radical-g${g}`);
      assert.equal(q.choices.length, 4, `g${g} 4択が崩れた`);
      assert.equal(new Set(q.choices).size, 4, `g${g} 重複`);
      const fam = radicalFamily(q.answer);
      for (const d of q.choices.filter((c) => c !== q.answer))
        assert.notEqual(
          radicalFamily(d),
          fam,
          `g${g} ${q.text} 正解=${q.answer} ダミー=${d}`,
        );
    }
  }
});
```

- [ ] **Step 3: テストが失敗することを確認**

```bash
cd /d/Desktop-Archive/manabi-quest && node --test tests/kanji-quiz-family.test.mjs
```
Expected: FAIL（radicalFamily が export されていない）。

- [ ] **Step 4: js/kanji-quiz.js を実装**

1. `KANJI_BY_GRADE` の定義の直後に追加:
```js
// 部首の同族ファミリー(氵と水 等)。部首問題のダミーから正解の同族を除外して
// 紛らわしい4択(泳の部首に氵と水が同時に並ぶ等)を防ぐ。
const RADICAL_FAMILIES = [
  ["氵", "水"],
  ["亻", "人"],
  ["扌", "手"],
  ["刂", "刀"],
  ["忄", "心"],
  ["灬", "火"],
  ["犭", "犬"],
  ["ネ", "示"],
  ["衤", "衣"],
  ["艹", "艸"],
  ["辶", "辵"],
  ["攵", "攴"],
  ["飠", "食"],
  ["王", "玉"],
  ["ツ", "⺍"],
];
const FAMILY_OF = new Map();
for (const fam of RADICAL_FAMILIES) for (const r of fam) FAMILY_OF.set(r, fam[0]);

export function radicalFamily(r) {
  return FAMILY_OF.get(r) ?? r;
}
```
2. `kind === "radical"` 分岐の `otherRadicals` を同族フィルタ付きに置き換え:
```js
  if (kind === "radical") {
    const answer = target.radical;
    const fam = radicalFamily(answer);
    const otherRadicals = list
      .filter((k) => k.kanji !== target.kanji)
      .map((k) => k.radical)
      .filter((r) => radicalFamily(r) !== fam);
    const dummies = sampleUnique(rng, otherRadicals, 3, new Set([answer]));
```
（分岐内のこれ以降は既存のまま。）

- [ ] **Step 5: テスト通過と全体グリーンを確認**

```bash
cd /d/Desktop-Archive/manabi-quest && node --test tests/kanji-quiz-family.test.mjs && npm test
```
Expected: すべてPASS（4択崩れが出た場合はどの学年・部首かをレポートし BLOCKED。ファミリーを勝手に増減しない）。

- [ ] **Step 6: コミット**

```bash
cd /d/Desktop-Archive/manabi-quest
git add js/kanji-quiz.js tests/kanji-quiz-family.test.mjs
git commit -m "feat: 部首問題のダミーから正解と同族の部首を除外(氵/水等15ファミリー)"
```

---

### Task 2: streak系ロック文言＋sw v1.6.1

**Files:**
- Modify: `js/app.js`（renderBadges の未獲得セル文言のみ）
- Modify: `sw.js:2`（CACHE を v1.6.1 に。**他は変更しない**）

**Interfaces:**
- Consumes: `renderBadges()` 内の未獲得分岐（`st.earned` 偽側）。バッジIDの `streak-` プレフィックス。

- [ ] **Step 1: 文言変更**

`js/app.js` の `renderBadges()` 未獲得セルの `badge-left` を置き換え:
```js
        if (!st.earned)
          return `<div class="badge-cell locked">
            <div class="badge-icon">🔒</div>
            <div class="badge-name">${b.name}</div>
            <div class="badge-left">${
              b.id.startsWith("streak-")
                ? `さいこう れんぞく あと${st.target - st.current}日`
                : `あと${st.target - st.current}${b.unit}`
            }</div>
          </div>`;
```
（既存の該当ブロックと差し替え。クラス構造は変えない。）

- [ ] **Step 2: sw.js の CACHE を v1.6.1 に**

`const CACHE = "manabi-quest-v1.6.0";` → `const CACHE = "manabi-quest-v1.6.1";`

- [ ] **Step 3: テスト＋ブラウザ確認**

```bash
cd /d/Desktop-Archive/manabi-quest && npm test
```
Expected: 全件PASS（文言のみでロジック変更なし）。
ブラウザ（chrome-devtools MCP か ヘッドレス）でバッジちょうを開き、未獲得のれんぞく系が「さいこう れんぞく あと3日」形式・他バッジが従来の「あと○○」であることを確認（新規localStorage状態でよい）。確認後サーバ停止。

- [ ] **Step 4: コミット**

```bash
cd /d/Desktop-Archive/manabi-quest
git add js/app.js sw.js
git commit -m "feat: streak系バッジのロック文言を「さいこう れんぞく あと○日」に＋sw v1.6.1"
```

---

### Task 3: Claude連携HTML手順書

**Files:**
- Create: `docs/claude-flow-guide.html`
- Modify: `README.md`（手順書への1行リンク追記）

**Interfaces:**
- Produces: 公開URL `https://takagifamilyclinic-source.github.io/manabi-quest/docs/claude-flow-guide.html`（マージ後）。

- [ ] **Step 1: アプリの実UI文言を確認**

`js/app.js` の親ページ関連（`attachParentGear` / `openParentGate` / `renderParentDash`）を読み、手順書に書くボタン名・操作（⚙の位置と長押し・PIN・「きろくを 書き出す」）が実装と一致することを確認。相違があればHTML側を実装に合わせる。

- [ ] **Step 2: docs/claude-flow-guide.html を作成**

以下の内容で作成（自己完結・外部読み込みなし。文言は Step 1 の確認結果で必要なら修正）:

```html
<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>まなびクエスト × Claude 連携手順書</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: "BIZ UDPGothic", "Hiragino Sans", "Yu Gothic UI", sans-serif;
    background: #f7f8fc; color: #1a2456;
    line-height: 1.9; font-size: 18px;
    max-width: 720px; margin: 0 auto; padding: 24px 20px 60px;
  }
  h1 { font-size: 26px; margin: 12px 0 4px; }
  .sub { color: #5a6390; margin-bottom: 24px; }
  h2 { font-size: 21px; margin: 36px 0 12px; border-left: 8px solid #f5a623; padding-left: 10px; }
  .flow { display: flex; flex-wrap: wrap; gap: 8px; align-items: stretch; margin: 16px 0; }
  .flow .box {
    flex: 1 1 140px; background: #fff; border: 2px solid #dfe3f2;
    border-radius: 12px; padding: 10px; text-align: center; font-weight: bold;
  }
  .flow .box small { display: block; font-weight: normal; color: #5a6390; font-size: 13px; }
  .flow .arrow { align-self: center; font-size: 20px; color: #f5a623; }
  .step { display: flex; gap: 14px; background: #fff; border-radius: 14px;
    padding: 16px; margin: 12px 0; border: 1px solid #e3e7f5; }
  .num { flex: 0 0 44px; height: 44px; border-radius: 50%; background: #f5a623;
    color: #fff; font-size: 22px; font-weight: bold; display: flex;
    align-items: center; justify-content: center; }
  .step b { display: block; margin-bottom: 4px; }
  code, .say {
    background: #eef1fb; border-radius: 6px; padding: 2px 8px;
    font-family: Consolas, monospace; font-size: 16px;
  }
  .say { display: block; padding: 10px 14px; margin-top: 6px; }
  .warn { background: #fff6e5; border: 1px solid #ffd98a; border-radius: 12px;
    padding: 14px 16px; margin: 10px 0; }
  .warn b { color: #a05c00; }
  footer { margin-top: 40px; color: #8b93b8; font-size: 14px; }
</style>
</head>
<body>
<h1>🎒 まなびクエスト × Claude 連携手順書</h1>
<div class="sub">子どもの「にがて」に合わせてアプリを育てるためのフロー（忘れ防止メモ）</div>

<h2>これは何？</h2>
<p>アプリに記録された成績を Claude Code に渡すと、苦手の分析とアプリの改善（問題の調整・データ追加など）をしてもらえます。この循環を回すための手順書です。</p>
<div class="flow">
  <div class="box">📱 iPadで<br>きろくを書き出す<small>親ページ</small></div>
  <div class="arrow">▶</div>
  <div class="box">💻 PCで<br>Claudeに渡す<small>/manabi</small></div>
  <div class="arrow">▶</div>
  <div class="box">🤖 分析と改善<small>承認してから実装</small></div>
  <div class="arrow">▶</div>
  <div class="box">🔄 iPadに反映<small>開き直すだけ</small></div>
</div>

<h2>📱 iPad側（きろくの書き出し）</h2>
<div class="step"><div class="num">1</div><div><b>プロフィール画面を開く</b>アプリを起動した最初の画面（プレイヤーえらび）。</div></div>
<div class="step"><div class="num">2</div><div><b>右下の ⚙ を長押し</b>数秒おさえると PIN 入力が出ます。PIN（4桁）を入れて親ページへ。</div></div>
<div class="step"><div class="num">3</div><div><b>「きろくを 書き出す」をタップ</b>下の枠に記録（JSON）が表示され、自動で全選択されます。そのままコピー。</div></div>
<div class="step"><div class="num">4</div><div><b>PCへ送る</b>メール・メモ共有など、いつもの方法でOK。</div></div>

<h2>💻 PC側（Claudeに渡す）</h2>
<div class="step"><div class="num">5</div><div><b>Claude Code を起動して <code>/manabi</code></b>まなびクエスト開発モードで再開します。</div></div>
<div class="step"><div class="num">6</div><div><b>記録を貼り付けて依頼</b><span class="say">この記録から苦手を分析して: （ここにJSONを貼り付け）</span></div></div>
<div class="step"><div class="num">7</div><div><b>Claudeがやること</b>苦手Topの分析→改善の提案。<b>提案にOKを出してから</b>実装・git push まで進みます（勝手には変えません）。</div></div>

<h2>🔄 反映の確認</h2>
<div class="step"><div class="num">8</div><div><b>数分待って iPad でアプリを開き直す</b>公開ページが自動更新され、アプリが新しい中身に入れ替わります（Service Worker が新バージョンを取得）。</div></div>

<h2>😵 こまったとき</h2>
<div class="warn"><b>更新が来ない</b> → アプリを完全に閉じて開き直す（それでもダメなら1日おいてもう一度）。</div>
<div class="warn"><b>PINを忘れた</b> → PCでClaudeに「まなびクエストのPINをリセットして」と頼む（データは消えません）。</div>
<div class="warn"><b>記録が大きすぎて貼れない</b> → テキストファイルに保存して「このファイルを読んで」と渡す。</div>

<footer>まなびクエスト（https://takagifamilyclinic-source.github.io/manabi-quest/）／この手順書もアプリと一緒に更新されます。</footer>
</body>
</html>
```

- [ ] **Step 3: README に1行追記**

READMEの適切な節（運用・使い方の並び）に:
```markdown
- Claude連携（苦手分析→改善→反映）の手順書: `docs/claude-flow-guide.html`（公開URL: https://takagifamilyclinic-source.github.io/manabi-quest/docs/claude-flow-guide.html ）
```

- [ ] **Step 4: 表示確認**

ヘッドレスまたはブラウザで `docs/claude-flow-guide.html` を開き、レイアウト崩れ・文字化けがないこと、外部リクエストが発生しないことを確認（file://直開きでもOKなことも確認）。

- [ ] **Step 5: テスト→コミット**

```bash
cd /d/Desktop-Archive/manabi-quest && npm test
git add docs/claude-flow-guide.html README.md
git commit -m "docs: Claude連携の完全フロー手順書(HTML・公開ページ配信)"
```

---

### Task 4: 最終レビュー→マージ→公開→短縮→クローズ（コントローラ実施）

- [ ] **Step 1: 最終全体レビュー**（ブランチ全体・Ready to merge 判定）
- [ ] **Step 2: masterマージ(--no-ff)→push→live確認**（sw v1.6.1・kanji-quiz.jsのradicalFamily・手順書URLの3点）
- [ ] **Step 3: デスクトップ短縮作成**

`C:\Users\User\Desktop\アプリ\まなびクエスト手順書.url` を作成:
```
[InternetShortcut]
URL=file:///D:/Desktop-Archive/manabi-quest/docs/claude-flow-guide.html
```

- [ ] **Step 4: docs/進捗.md・メモリ更新→コミット→push**
