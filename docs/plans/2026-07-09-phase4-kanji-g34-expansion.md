# 第4弾(その1) 漢字の意味・部首・画数を3・4年へ拡張 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 3・4年生の漢字402字に部首・画数データを追加し、全学年で5形式（読み・書き・意味・部首・画数）の出題を有効化して「全形式×642字」を完成させる。

**Architecture:** KANJIDIC2（EDRDG公式・無料）＋KRADFILE から部首・画数を機械抽出し、既存の照合済みg1/g2データ240字で抽出規則を答え合わせ（適用前ゲート）してから g3/g4 に適用。コード変更は `kanjiSkills()` の学年分岐撤廃のみ。schema変更なし・移行不要。

**Tech Stack:** buildless バニラJS（ESモジュール・依存ゼロ）・`node --test`・PWA（sw.js）・GitHub Pages。

**設計書:** `docs/specs/2026-07-09-phase4-kanji-g34-expansion-design.md`

## Global Constraints

- **課金ゼロ**：KANJIDIC2/KRADFILEは無料公開データのダウンロードのみ（$0）。従量課金API不使用。GitHub無料枠のみ。
- **既存の `yomi` / `meaning` は一切変更しない**（第2弾で出典照合済み）。各適用ステップで不変検証を行う。
- **事実データは出典照合・捏造しない**：部首・画数は出典（KANJIDIC2）からの機械抽出＋三段検証（答え合わせ・機械テスト・抜き取りレビュー）。自分の記憶で埋めることは禁止。
- **`sw.js` の CACHE は最後に v1.5.0 へ**（データ・JS変更のため。Task 6）。
- **`npm test` は各タスク完了時に全件グリーン**（既存93件を壊さない）。
- 依存追加禁止（package.json に dependencies を足さない）。抽出スクリプトは使い捨てで、**git管理外の `.superpowers/work/kanji-extract/` に置き、リポジトリにコミットしない**。
- README に EDRDG 帰属表記を追加する（KANJIDIC2 のライセンス条件・Task 6）。
- 作業ブランチ `feature/phase4-kanji-g34` で行い、最後に master へ `--no-ff` マージ。

## 前提知識（実装者向け）

- 既存データ形式（`data/kanji/g1.js` の例）:
  ```js
  export const KANJI_G1 = [
    { kanji: "一", grade: 1, yomi: ["いち", "ひと"], meaning: "ひとつ", radical: "一", strokes: 1 },
    ...
  ];
  ```
  g3/g4 は現在 `radical` / `strokes` が無い（それ以外は同形式）。g3=200字・g4=202字。
- **部首表記の流儀（重要）**: 既存g1/g2は学校辞書流の**偏・冠バリエーション**を使う（例: 海=氵、体=亻、道=辶、数=攵、囗と口も区別）。KANJIDIC2の部首は康熙部首**番号**（基底形）なので、番号→基底文字だけでは一致しない。KRADFILE（字→構成部品）を併用し「その字が変形部品を含むなら変形表記」の規則で解決する。規則の正しさはg1/g2の240字（照合済み）との一致で証明する。
- 康熙部首番号n→基底文字: Unicode康熙部首ブロック `U+2F00 + (n-1)` を **NFKC正規化**すると通常の漢字コードポイントになる（例: n=30 → U+2F1D → NFKC → 口 U+53E3）。
- KRADFILE は EUC-JP エンコード。Node の `new TextDecoder("euc-jp")` でデコードできる（公式バイナリはfull-ICU）。KRADFILEの部品一覧は変形部品を**代表字**で表すことがある（例: 氵を「汁」で表す等）。そのためマーカー候補は答え合わせで**経験的にチューニング**する（Task 1 Step 5）。
- `npm test` = `node --test tests/`（package.jsonで確認のこと）。

---

### Task 1: 抽出パイプライン構築＋g1/g2答え合わせ検証（適用前ゲート）

**Files:**
- Create: `.superpowers/work/kanji-extract/extract-kanji.mjs`（git管理外・使い捨て）
- Create: `.superpowers/work/kanji-extract/kanjidic2.xml.gz` / `kradfile.gz`（ダウンロード物）
- Create（出力）: `.superpowers/work/kanji-extract/g3-radstrokes.json` / `g4-radstrokes.json` / `concordance-report.txt` / `flagged.txt`

**Interfaces:**
- Produces: `g3-radstrokes.json` / `g4-radstrokes.json` — `{ "<字>": { "radical": "<部首文字>", "strokes": <整数> }, ... }` 形式。Task 2/3 の apply が読む。
- Produces: `extract-kanji.mjs` の `--apply <path>` モード（Task 2/3 が使用）。
- Produces: `flagged.txt` — 変形候補があるのに部品確認できず基底形にした字の一覧（Task 5 のレビュー必須対象）。

- [ ] **Step 1: 作業ブランチ作成と作業ディレクトリ準備**

```bash
cd /d/Desktop-Archive/manabi-quest
git checkout -b feature/phase4-kanji-g34
mkdir -p .superpowers/work/kanji-extract
git check-ignore .superpowers/work/kanji-extract && echo "OK: git管理外"
```
Expected: `OK: git管理外` が出る（出なければ `.gitignore` に `.superpowers/` を追記してからコミット）。

- [ ] **Step 2: KANJIDIC2 と KRADFILE をダウンロード（無料・$0）**

```bash
cd /d/Desktop-Archive/manabi-quest/.superpowers/work/kanji-extract
curl -L -o kanjidic2.xml.gz "https://www.edrdg.org/kanjidic/kanjidic2.xml.gz"
curl -L -o kradfile.gz "http://ftp.edrdg.org/pub/Nihongo/kradfile.gz"
ls -la kanjidic2.xml.gz kradfile.gz
```
Expected: 両ファイルが存在（kanjidic2は約1.5MB・kradfileは約100KB）。ダウンロード失敗時は `https://www.edrdg.org/wiki/index.php/KANJIDIC_Project` で配布URLを確認して再試行。

- [ ] **Step 3: 抽出スクリプトを書く**

`.superpowers/work/kanji-extract/extract-kanji.mjs` を以下の内容で作成:

```js
// 使い捨て抽出スクリプト。KANJIDIC2+KRADFILEから部首(学校辞書流)・画数を抽出。
// モード:
//   node extract-kanji.mjs check   … g1/g2の既存240字と答え合わせ(適用前ゲート)
//   node extract-kanji.mjs emit    … g3/g4分をJSONに出力(+flagged.txt)
//   node extract-kanji.mjs apply ../../data/kanji/g3.js g3-radstrokes.json KANJI_G3
import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { pathToFileURL } from "node:url";

const DIR = new URL(".", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const REPO = `${DIR}/../../..`.replace(/\\/g, "/");

// --- KANJIDIC2: 字 → {radNum, strokes} ---
const xml = gunzipSync(readFileSync(`${DIR}/kanjidic2.xml.gz`)).toString("utf8");
const dic = new Map();
for (const m of xml.matchAll(/<character>([\s\S]*?)<\/character>/g)) {
  const b = m[1];
  const lit = b.match(/<literal>(.+?)<\/literal>/)?.[1];
  const rad = b.match(/<rad_value rad_type="classical">(\d+)<\/rad_value>/)?.[1];
  const st = b.match(/<stroke_count>(\d+)<\/stroke_count>/)?.[1]; // 先頭値=正
  if (lit && rad && st) dic.set(lit, { radNum: Number(rad), strokes: Number(st) });
}

// --- KRADFILE: 字 → 構成部品(EUC-JP) ---
const kradRaw = new TextDecoder("euc-jp").decode(gunzipSync(readFileSync(`${DIR}/kradfile.gz`)));
const krad = new Map();
for (const line of kradRaw.split("\n")) {
  if (!line || line.startsWith("#")) continue;
  const [ch, parts] = line.split(" : ");
  if (ch && parts) krad.set(ch.trim(), parts.trim().split(/\s+/));
}

// --- 部首番号 → 基底文字(康熙部首ブロックU+2F00..をNFKC正規化) ---
const baseRadical = (n) => String.fromCodePoint(0x2f00 + n - 1).normalize("NFKC");

// --- 学校辞書流の変形表記。markers=KRADFILE上でその変形を示す部品候補(答え合わせでチューニング) ---
const VARIANTS = {
  9: { display: "亻", markers: ["亻", "化"] },
  18: { display: "刂", markers: ["刂", "刈"] },
  61: { display: "忄", markers: ["忄", "忙"] },
  64: { display: "扌", markers: ["扌", "扎"] },
  66: { display: "攵", markers: ["攵"] },
  85: { display: "氵", markers: ["氵", "汁"] },
  86: { display: "灬", markers: ["灬", "杰"] },
  94: { display: "犭", markers: ["犭", "犯"] },
  96: { display: "王", markers: ["王"] },
  113: { display: "礻", markers: ["礻", "礼"] },
  122: { display: "罒", markers: ["罒", "買"] },
  130: { display: "月", markers: ["月"] },
  140: { display: "艹", markers: ["艹", "艾"] },
  145: { display: "衤", markers: ["衤", "初"] },
  162: { display: "辶", markers: ["辶", "込"] },
  163: { display: "阝", markers: ["阝", "邦"] },
  170: { display: "阝", markers: ["阝", "阡"] },
  184: { display: "飠", markers: ["飠", "飲"] },
};

// --- 個別解決(答え合わせ・辞書照合で確定した例外。必ず理由コメントを付ける) ---
const OVERRIDES = {
  // "字": "部首",  // 理由
};

const flagged = [];
function resolveRadical(ch) {
  if (OVERRIDES[ch]) return OVERRIDES[ch];
  const e = dic.get(ch);
  if (!e) throw new Error(`KANJIDIC2に無い: ${ch}`);
  const v = VARIANTS[e.radNum];
  if (!v) return baseRadical(e.radNum);
  const parts = krad.get(ch) || [];
  if (v.markers.some((mk) => parts.includes(mk))) return v.display;
  flagged.push(`${ch} radNum=${e.radNum} 基底=${baseRadical(e.radNum)} 部品=[${parts.join(" ")}]`);
  return baseRadical(e.radNum);
}
const resolveStrokes = (ch) => dic.get(ch).strokes;

async function loadGrade(file, exportName) {
  const mod = await import(pathToFileURL(`${REPO}/data/kanji/${file}`).href);
  return mod[exportName];
}

const mode = process.argv[2];

if (mode === "check") {
  // g1/g2の照合済み240字で答え合わせ。100%一致(またはOVERRIDES/既存データ修正で説明)がゲート。
  const lists = [...(await loadGrade("g1.js", "KANJI_G1")), ...(await loadGrade("g2.js", "KANJI_G2"))];
  let okR = 0, okS = 0;
  const missR = [], missS = [];
  for (const k of lists) {
    const r = resolveRadical(k.kanji);
    const s = resolveStrokes(k.kanji);
    if (r === k.radical) okR++;
    else missR.push(`${k.kanji}: 既存=${k.radical} 抽出=${r} radNum=${dic.get(k.kanji).radNum} 部品=[${(krad.get(k.kanji) || []).join(" ")}]`);
    if (s === k.strokes) okS++;
    else missS.push(`${k.kanji}: 既存=${k.strokes} 抽出=${s}`);
  }
  const report = [
    `部首一致: ${okR}/${lists.length}`, ...missR,
    `画数一致: ${okS}/${lists.length}`, ...missS,
    `flagged(変形候補未確認→基底形): ${flagged.length}`, ...flagged,
  ].join("\n");
  writeFileSync(`${DIR}/concordance-report.txt`, report);
  console.log(report);
} else if (mode === "emit") {
  for (const [file, exportName, out] of [
    ["g3.js", "KANJI_G3", "g3-radstrokes.json"],
    ["g4.js", "KANJI_G4", "g4-radstrokes.json"],
  ]) {
    const list = await loadGrade(file, exportName);
    const data = {};
    for (const k of list) data[k.kanji] = { radical: resolveRadical(k.kanji), strokes: resolveStrokes(k.kanji) };
    writeFileSync(`${DIR}/${out}`, JSON.stringify(data, null, 2));
    console.log(`${out}: ${Object.keys(data).length}字`);
  }
  writeFileSync(`${DIR}/flagged.txt`, flagged.join("\n"));
  console.log(`flagged: ${flagged.length}件 → flagged.txt (Task 5 レビュー必須対象)`);
} else if (mode === "apply") {
  // 例: node extract-kanji.mjs apply g3.js g3-radstrokes.json KANJI_G3
  const [, , , file, json, exportName] = process.argv;
  const list = await loadGrade(file, exportName);
  const data = JSON.parse(readFileSync(`${DIR}/${json}`, "utf8"));
  const out = list.map((k) => ({ ...k, radical: data[k.kanji].radical, strokes: data[k.kanji].strokes }));
  const body = out
    .map((k) => `  { kanji: ${JSON.stringify(k.kanji)}, grade: ${k.grade}, yomi: ${JSON.stringify(k.yomi)}, meaning: ${JSON.stringify(k.meaning)}, radical: ${JSON.stringify(k.radical)}, strokes: ${k.strokes} },`)
    .join("\n");
  const target = `${REPO}/data/kanji/${file}`;
  writeFileSync(target, `export const ${exportName} = [\n${body}\n];\n`);
  // 不変検証: yomi/meaning/kanji/grade が元と同一か(radical/strokes以外変更禁止)
  const after = (await import(pathToFileURL(target).href + `?v=${out.length}`))[exportName];
  for (let i = 0; i < list.length; i++) {
    const a = list[i], b = after[i];
    if (a.kanji !== b.kanji || a.grade !== b.grade || a.meaning !== b.meaning || JSON.stringify(a.yomi) !== JSON.stringify(b.yomi))
      throw new Error(`不変検証失敗: ${a.kanji}`);
  }
  console.log(`${file}: ${out.length}字に radical/strokes を追記(yomi/meaning不変を検証済み)`);
} else {
  console.log("usage: node extract-kanji.mjs check|emit|apply <g?.js> <json> <EXPORT>");
}
```

- [ ] **Step 4: 答え合わせを実行**

```bash
cd /d/Desktop-Archive/manabi-quest/.superpowers/work/kanji-extract
node extract-kanji.mjs check
```
Expected: `部首一致: N/240`・`画数一致: M/240` が表示される。初回はNが240未満のはず（変形マーカー未調整のため）。

- [ ] **Step 5: 不一致ゼロまでチューニング（このタスクの核心）**

`concordance-report.txt` の不一致を1件ずつ見て、以下の優先順で解決する:
1. **マーカー調整**: 不一致行の `部品=[...]` を見て、KRADFILEが変形をどの代表字で表すかを特定し、`VARIANTS` の `markers` に追加（例: 部品に「汁」でなく別の字が出ていればそれを追加）。
2. **OVERRIDES追加**: 規則で解決できない個別の字は `OVERRIDES` に「字→部首」を理由コメント付きで追加。**ただし部首の値は必ず辞書（漢字辞典オンライン等のWeb辞書）で照合してから書く。記憶で書かない。**
3. **既存データの誤り疑い**: 抽出側が正しいと思われる場合（過去例: 円の部首を冂に訂正）は勝手に直さず、辞書で確認のうえ g1/g2 データを修正する**別コミット**を作る（コミットメッセージに出典を書く）。

`node extract-kanji.mjs check` を再実行し、**部首一致=240/240・画数一致=240/240 になるまで**繰り返す。
Expected（最終）: `部首一致: 240/240`・`画数一致: 240/240`。**これが適用前ゲート。未達のままTask 2に進むこと禁止。**

- [ ] **Step 6: g3/g4分を出力**

```bash
node extract-kanji.mjs emit
```
Expected: `g3-radstrokes.json: 200字`・`g4-radstrokes.json: 202字`・flagged件数の表示。flagged.txt の中身を確認し、件数と代表例を台帳（`.superpowers/sdd/progress.md`）に記録（Task 5 のレビュー必須対象になる）。

- [ ] **Step 7: 検証結果の記録（コミットはドキュメントのみ）**

このタスクではリポジトリのデータ・コードは変更しない（g1/g2修正が出た場合のみStep 5-3の別コミットあり）。答え合わせ結果（一致率・OVERRIDES件数と内訳・flagged件数）を台帳に記録して完了報告する。

---

### Task 2: g3（200字）に radical/strokes 追記＋テスト強化（TDD）

**Files:**
- Create: `tests/radical-sets.mjs`（部首妥当性ヘルパ・テスト専用）
- Modify: `tests/kanji-data-g3.test.mjs`（radical/strokes必須テスト追加）
- Modify: `data/kanji/g3.js`（radical/strokes追記・yomi/meaning不変）

**Interfaces:**
- Consumes: Task 1 の `extract-kanji.mjs apply` モードと `g3-radstrokes.json`。
- Produces: `tests/radical-sets.mjs` が `isValidRadical(r): boolean` / `BASE_RADICALS: Set<string>` / `VARIANT_RADICALS: Set<string>` をexport（Task 3 も使う）。
- Produces: `data/kanji/g3.js` の全エントリに `radical: string` / `strokes: number` が付く。

- [ ] **Step 1: 部首妥当性ヘルパを書く**

`tests/radical-sets.mjs` を作成:

```js
// 部首の妥当性チェック用ヘルパ(テスト専用)
// 基底214部首 = Unicode康熙部首ブロック(U+2F00..U+2FD5)をNFKC正規化した通常漢字
export const BASE_RADICALS = new Set(
  Array.from({ length: 214 }, (_, i) =>
    String.fromCodePoint(0x2f00 + i).normalize("NFKC"),
  ),
);
// 学校辞書流の偏・冠バリエーション(g1/g2既存データ+今回抽出で使用する形)
// ※答え合わせ(Task 1)で確定した集合に合わせて増減してよい(理由をコミットに書く)
export const VARIANT_RADICALS = new Set([
  "亻", "刂", "忄", "扌", "攵", "氵", "灬", "犭", "王",
  "礻", "罒", "艹", "衤", "辶", "阝", "飠",
]);
export function isValidRadical(r) {
  return BASE_RADICALS.has(r) || VARIANT_RADICALS.has(r);
}
```

- [ ] **Step 2: g3テストに radical/strokes 必須チェックを追加（失敗するテスト）**

`tests/kanji-data-g3.test.mjs` の末尾に追加:

```js
import { isValidRadical } from "./radical-sets.mjs";

test("g3全字に radical(妥当な部首)と strokes(1〜20の整数)がある", () => {
  for (const k of KANJI_G3) {
    assert.ok(k.radical && isValidRadical(k.radical), `${k.kanji} radical=${k.radical}`);
    assert.ok(Number.isInteger(k.strokes) && k.strokes >= 1 && k.strokes <= 20, `${k.kanji} strokes=${k.strokes}`);
  }
});
```

- [ ] **Step 3: テストが失敗することを確認**

```bash
cd /d/Desktop-Archive/manabi-quest && node --test tests/kanji-data-g3.test.mjs
```
Expected: FAIL（radical が undefined のため）。

- [ ] **Step 4: apply でデータ追記**

```bash
cd /d/Desktop-Archive/manabi-quest/.superpowers/work/kanji-extract
node extract-kanji.mjs apply g3.js g3-radstrokes.json KANJI_G3
```
Expected: `g3.js: 200字に radical/strokes を追記(yomi/meaning不変を検証済み)`。

- [ ] **Step 5: テスト通過と全体グリーンを確認**

```bash
cd /d/Desktop-Archive/manabi-quest && node --test tests/kanji-data-g3.test.mjs && npm test
```
Expected: 対象テストPASS・全体PASS（失敗した場合、部首が妥当集合に無いなら Task 1 の答え合わせ結果と照らして VARIANT_RADICALS を調整するか抽出を見直す）。

- [ ] **Step 6: 差分確認とコミット**

```bash
cd /d/Desktop-Archive/manabi-quest
git diff --stat data/kanji/g3.js
git add tests/radical-sets.mjs tests/kanji-data-g3.test.mjs data/kanji/g3.js
git commit -m "feat: 漢字3年200字に部首・画数を追加(KANJIDIC2抽出・g1/g2答え合わせ済み)"
```

---

### Task 3: g4（202字）に radical/strokes 追記＋全642字妥当性テスト（TDD）

**Files:**
- Modify: `tests/kanji-data-g4.test.mjs`（radical/strokes必須テスト追加）
- Create: `tests/kanji-radical-validity.test.mjs`（全642字の横断妥当性）
- Modify: `data/kanji/g4.js`（radical/strokes追記・yomi/meaning不変）

**Interfaces:**
- Consumes: Task 1 の `extract-kanji.mjs apply` と `g4-radstrokes.json`、Task 2 の `tests/radical-sets.mjs`（`isValidRadical`）。
- Produces: `data/kanji/g4.js` の全エントリに `radical: string` / `strokes: number` が付く。

- [ ] **Step 1: g4テストに必須チェックを追加（失敗するテスト）**

`tests/kanji-data-g4.test.mjs` の末尾に追加（importは `KANJI_G4` が既にある前提でヘルパのみ追加）:

```js
import { isValidRadical } from "./radical-sets.mjs";

test("g4全字に radical(妥当な部首)と strokes(1〜20の整数)がある", () => {
  for (const k of KANJI_G4) {
    assert.ok(k.radical && isValidRadical(k.radical), `${k.kanji} radical=${k.radical}`);
    assert.ok(Number.isInteger(k.strokes) && k.strokes >= 1 && k.strokes <= 20, `${k.kanji} strokes=${k.strokes}`);
  }
});
```

- [ ] **Step 2: 全642字の横断妥当性テストを作成**

`tests/kanji-radical-validity.test.mjs` を作成:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { KANJI_BY_GRADE } from "../js/kanji-quiz.js";
import { isValidRadical } from "./radical-sets.mjs";

test("全642字: radicalは妥当な部首・strokesは1〜20の整数", () => {
  let total = 0;
  for (const grade of [1, 2, 3, 4]) {
    for (const k of KANJI_BY_GRADE[grade]) {
      total++;
      assert.ok(isValidRadical(k.radical), `g${grade} ${k.kanji} radical=${k.radical}`);
      assert.ok(
        Number.isInteger(k.strokes) && k.strokes >= 1 && k.strokes <= 20,
        `g${grade} ${k.kanji} strokes=${k.strokes}`,
      );
    }
  }
  assert.equal(total, 642);
});
```

- [ ] **Step 3: テストが失敗することを確認**

```bash
cd /d/Desktop-Archive/manabi-quest && node --test tests/kanji-data-g4.test.mjs tests/kanji-radical-validity.test.mjs
```
Expected: FAIL（g4のradicalが未定義のため）。

- [ ] **Step 4: apply でデータ追記**

```bash
cd /d/Desktop-Archive/manabi-quest/.superpowers/work/kanji-extract
node extract-kanji.mjs apply g4.js g4-radstrokes.json KANJI_G4
```
Expected: `g4.js: 202字に radical/strokes を追記(yomi/meaning不変を検証済み)`。

- [ ] **Step 5: テスト通過と全体グリーンを確認**

```bash
cd /d/Desktop-Archive/manabi-quest && node --test tests/kanji-data-g4.test.mjs tests/kanji-radical-validity.test.mjs && npm test
```
Expected: すべてPASS。

- [ ] **Step 6: コミット**

```bash
cd /d/Desktop-Archive/manabi-quest
git add tests/kanji-data-g4.test.mjs tests/kanji-radical-validity.test.mjs data/kanji/g4.js
git commit -m "feat: 漢字4年202字に部首・画数を追加＋全642字の妥当性テスト"
```

---

### Task 4: 全学年5形式の出題有効化（kanjiSkills）＋出題テスト（TDD）

**Files:**
- Modify: `js/kanji-quiz.js:14-24`（`kanjiSkills` の学年分岐撤廃）
- Modify: `tests/kanji-quiz.test.mjs:9-26`（期待値を全学年5形式に更新）
- Modify: `tests/kanji-quiz-extra.test.mjs:18`（同上）＋g3/g4新形式の生成テスト追加

**Interfaces:**
- Consumes: Task 2/3 のデータ（radical/strokes入りg3/g4）。
- Produces: `kanjiSkills(grade)` が全学年で `["kanji-read-g<g>", "kanji-write-g<g>", "kanji-mean-g<g>", "kanji-radical-g<g>", "kanji-stroke-g<g>"]` を返す。`session.js` は既にこれを使うため変更不要。

- [ ] **Step 1: 既存テストの期待値を更新し、新形式の生成テストを追加（失敗するテスト）**

`tests/kanji-quiz.test.mjs` の9〜26行目のテストを次に置き換え:

```js
test("kanjiSkills は全学年で読み・書き・意味・部首・筆順の5形式を返す", () => {
  for (const g of [1, 2, 3, 4]) {
    assert.deepEqual(kanjiSkills(g), [
      `kanji-read-g${g}`,
      `kanji-write-g${g}`,
      `kanji-mean-g${g}`,
      `kanji-radical-g${g}`,
      `kanji-stroke-g${g}`,
    ]);
  }
});
```

`tests/kanji-quiz-extra.test.mjs` の18行目 `assert.deepEqual(kanjiSkills(3), ["kanji-read-g3", "kanji-write-g3"]);` を含むテストを5形式期待に更新し、さらに末尾へ生成テストを追加:

```js
test("g3/g4の意味・部首・画数問題: 4択・正解含有・重複なし", () => {
  for (const tag of [
    "kanji-mean-g3", "kanji-radical-g3", "kanji-stroke-g3",
    "kanji-mean-g4", "kanji-radical-g4", "kanji-stroke-g4",
  ]) {
    for (let i = 0; i < 200; i++) {
      const q = makeKanjiQuestion(tag);
      assert.equal(q.choices.length, 4, `${tag} choices at ${i}`);
      assert.ok(q.choices.includes(q.answer), `${tag} answer missing at ${i}`);
      assert.equal(new Set(q.choices).size, 4, `${tag} dup at ${i}`);
    }
  }
});
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
cd /d/Desktop-Archive/manabi-quest && node --test tests/kanji-quiz.test.mjs tests/kanji-quiz-extra.test.mjs
```
Expected: FAIL（kanjiSkills(3)が2形式しか返さないため）。

- [ ] **Step 3: kanjiSkills の学年分岐を撤廃**

`js/kanji-quiz.js` の `kanjiSkills` を次に置き換え:

```js
export function kanjiSkills(grade) {
  return [
    `kanji-read-g${grade}`,
    `kanji-write-g${grade}`,
    `kanji-mean-g${grade}`,
    `kanji-radical-g${grade}`,
    `kanji-stroke-g${grade}`,
  ];
}
```

- [ ] **Step 4: テスト通過と全体グリーンを確認**

```bash
cd /d/Desktop-Archive/manabi-quest && npm test
```
Expected: 全件PASS（既存93件+今回追加分）。

- [ ] **Step 5: コミット**

```bash
cd /d/Desktop-Archive/manabi-quest
git add js/kanji-quiz.js tests/kanji-quiz.test.mjs tests/kanji-quiz-extra.test.mjs
git commit -m "feat: 3・4年も意味・部首・画数を出題(全学年5形式に統一)"
```

---

### Task 5: 抜き取り出典照合レビュー（レビューゲート・必須）

**Files:**
- Modify（誤り発見時のみ）: `data/kanji/g3.js` / `data/kanji/g4.js` / Task 1 スクリプトの `OVERRIDES`

**Interfaces:**
- Consumes: Task 2/3 のデータ、Task 1 の `flagged.txt`。
- Produces: 照合済みデータ（誤りゼロ確認 or 修正コミット）。

- [ ] **Step 1: レビュー対象を選定**

対象 = ①`flagged.txt` の全字（変形判定できず基底形にした字・最重要） ＋ ②g3/g4からランダム30字（各15字。node当てで選ぶ: `node -e "import('file:///D:/Desktop-Archive/manabi-quest/data/kanji/g3.js').then(m=>{const a=[...m.KANJI_G3].sort(()=>Math.random()-0.5).slice(0,15);console.log(a.map(k=>k.kanji+':'+k.radical+':'+k.strokes).join('\n'))})"` をg4も同様に）。

- [ ] **Step 2: 出典照合レビューを実施（サブエージェント）**

research-scout（WebFetch/WebSearch可）に対象リストを渡し、各字の部首（**学校辞書流の表記**。氵・辶など変形形が正か基底形が正かも含めて）と画数を**Web辞書（漢字辞典オンライン等）で1字ずつ照合**させ、「字 / 収録値 / 辞書値 / 一致か」の表で報告させる。**エージェント自身の記憶での判定は禁止**（照合元URLを引かせる）。

- [ ] **Step 3: 指摘の修正**

不一致が報告されたら、辞書側を再確認のうえ `data/kanji/g3.js` / `g4.js` の該当字を修正（Task 1 スクリプトの `OVERRIDES` にも理由付きで反映しておく）。修正後:

```bash
cd /d/Desktop-Archive/manabi-quest && npm test
git add data/kanji
git commit -m "fix: 出典照合レビュー指摘の部首・画数を訂正(出典: 漢字辞典オンライン)"
```
（不一致ゼロならコミット不要。レビュー結果を台帳に記録。）

Expected: 全対象一致（または修正済み）・`npm test` 全件PASS。

---

### Task 6: sw v1.5.0・README・ブラウザ目視・公開

**Files:**
- Modify: `sw.js:2`（CACHE を `manabi-quest-v1.5.0` に）
- Modify: `README.md`（第4弾の記載＋EDRDG帰属表記）
- Create→Delete: `_verify.html`（ヘッドレス検証用・検証後削除）

**Interfaces:**
- Consumes: Task 1〜5 の全成果。
- Produces: 公開済みサイト（https://takagifamilyclinic-source.github.io/manabi-quest/）に反映。

- [ ] **Step 1: sw.js の CACHE バージョンを上げる**

`sw.js` 2行目 `const CACHE = "manabi-quest-v1.4.0";` → `const CACHE = "manabi-quest-v1.5.0";`

- [ ] **Step 2: README 追記**

README.md のリリース履歴相当の箇所に第4弾を追記し、データ出典の節（無ければ新設）に以下の趣旨の帰属を追加:

```markdown
- 漢字の部首・画数データは KANJIDIC2 / KRADFILE（© EDRDG: Electronic Dictionary Research and Development Group, CC BY-SA 4.0, https://www.edrdg.org/）を出典として作成しました。
```

- [ ] **Step 3: ヘッドレス検証（既存パターン: 一時 _verify.html）**

リポジトリ直下に `_verify.html` を作成:

```html
<!doctype html><meta charset="utf-8"><div id="out"></div>
<script type="module">
  import { kanjiSkills, makeKanjiQuestion } from "./js/kanji-quiz.js";
  const lines = [];
  lines.push("skills-g3=" + kanjiSkills(3).join(","));
  lines.push("skills-g4=" + kanjiSkills(4).join(","));
  for (const tag of ["kanji-mean-g3", "kanji-radical-g3", "kanji-stroke-g4"]) {
    const q = makeKanjiQuestion(tag);
    lines.push(`${tag}: ${q.text} | ${q.choices.join("/")} | ans=${q.answer}`);
  }
  document.getElementById("out").textContent = lines.join("\n");
</script>
```

ローカルサーバで配信してヘッドレスChromeでDOMを確認:

```bash
cd /d/Desktop-Archive/manabi-quest && python -m http.server 8123 &
sleep 2
"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --dump-dom "http://127.0.0.1:8123/_verify.html" | grep -A6 'id="out"'
```
Expected: `skills-g3=` に5形式、部首問題に「ぶしゅは どれ?」、画数問題に「何画?」が表示され、choicesが4つ出ている。確認後:

```bash
kill %1
cd /d/Desktop-Archive/manabi-quest && rm _verify.html
```

- [ ] **Step 4: 実UIスモーク（任意だが推奨）**

chrome-devtools MCP で `http://127.0.0.1:8123/` を開き、3年生プロフィール→かんじ→バトルで意味/部首/画数の問題が混ざって出ることを1セッションぶん目視（10問中に read/write 以外が出ればOK。乱数なので出なければもう1周）。

- [ ] **Step 5: コミット→masterマージ→push**

```bash
cd /d/Desktop-Archive/manabi-quest
git add sw.js README.md
git commit -m "chore: sw v1.5.0・README第4弾(その1)＋EDRDG帰属"
npm test
git checkout master
git merge --no-ff feature/phase4-kanji-g34 -m "merge: 第4弾(その1) 漢字の意味・部首・画数を3・4年へ拡張(全形式×642字完成)"
git push origin master
```
Expected: マージ成功・push成功。

- [ ] **Step 6: 公開反映のlive確認（数分待ってから）**

```bash
curl -s "https://takagifamilyclinic-source.github.io/manabi-quest/sw.js" | head -3
curl -s "https://takagifamilyclinic-source.github.io/manabi-quest/data/kanji/g3.js" | grep -c "radical"
curl -s "https://takagifamilyclinic-source.github.io/manabi-quest/js/kanji-quiz.js" | grep -c "kanji-mean"
```
Expected: sw.jsに `v1.5.0`・g3.jsのradical件数が200・kanji-quiz.jsに kanji-mean が含まれる。反映前なら数分おいて再実行（GitHub Pagesのビルド待ち）。

---

### Task 7: ドキュメント・メモリ更新（クローズ）

**Files:**
- Modify: `docs/進捗.md`（第4弾(その1)完了を追記）
- Modify: メモリ `C:\Users\User\.claude\projects\C--Users-User-iCloudDrive-iCloud-md-obsidian----\memory\manabi-quest-app.md`

**Interfaces:**
- Consumes: Task 6 の公開結果（master コミットID・テスト件数）。

- [ ] **Step 1: docs/進捗.md 更新**

「リリース状況」に第4弾(その1)の行を追加（内容: 意味・部首・画数を3・4年へ拡張＝全形式×642字完成・出典KANJIDIC2＋三段検証・schema変更なし・sw v1.5.0・masterコミットID・テスト件数）。「第3弾の後続候補」から本件を消し、残候補（称号バッジ/英語/理科社会/Claude連携手順書）を「第4弾の後続候補」に改名。

- [ ] **Step 2: メモリ更新**

`manabi-quest-app.md` に第4弾(その1)完了の要点を追記（全形式×642字完成・KANJIDIC2抽出＋g1/g2答え合わせ方式・sw v1.5.0・schema v4のまま）。第4弾候補から本件を除去。

- [ ] **Step 3: コミット＆push**

```bash
cd /d/Desktop-Archive/manabi-quest
git add docs/進捗.md
git commit -m "docs: 第4弾(その1)完了を進捗ログに反映"
git push origin master
```
