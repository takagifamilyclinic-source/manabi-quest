# まなびクエスト 第3弾(その1) 設計書 — やる気の仕組み(XP・ごほうびポイント・進化)

作成日: 2026-07-08
対象: 第1・2弾公開済み(算数・漢字642字・苦手自動調整・親ページ・PWA)。本体 `D:\Desktop-Archive\manabi-quest`。
公開URL: https://takagifamilyclinic-source.github.io/manabi-quest/

第3弾は独立機能の集まりなので1つずつ実施。**本設計はその第1弾=「やる気の仕組み」のうち レベル・XP / ごほうびポイント帳 / モンスター進化(1段階)**。称号・バッジ、英語/理科社会、Claude連携は後続。

## 絶対条件(継続)
- 課金ゼロ(Pollinations無料・GitHub Pages無料枠のみ)
- こどものデータは端末内(localStorage)のみ・外部送信しない
- こども向け(大きい文字・56px+ボタン・誤答ペナルティなし)
- IP配慮(オリジナルモンスターのみ)
- GitHub Pagesサブパス配信で壊れない相対パス
- 画像生成前にプロンプト一覧を提示して承認を得る(保管庫ルール)
- **公開中のためスキーマ変更は移行を実装し既存進捗を保持**

## ① レベル・XP
- 獲得: **正解1問=10XP**、セッションクリア(10問終了)=**+50XP**。XPは貯まる一方(減らない)。
- レベル: 必要XPで上がる。**レベル n→n+1 に n×100 XP**(Lv1→2=100、Lv2→3=200…)。累積XPから現在レベルと次レベルまでの進捗を計算する純粋関数 `levelFromXp(xp) -> {level, inLevel, need}`。
- 表示: ホームに「Lv・XPバー」。レベルは成長のあかしで、進化やごほうびには使わない(役割分離)。

## ② ごほうびポイント帳(親が一覧・親が交換)
- ポイントはXPと別通貨。獲得: **正解1問=1ポイント**、セッションクリア=**+5ポイント**。使うと減る。
- 親ページに「ごほうび一覧」を登録: `settings.rewards = [{ id, name, cost }]`(品名＋必要ポイント。例「アイス=50」)。追加・削除可。
- こども側: ホームまたは専用画面で**ポイント残高**と「ごほうび一覧」を見るだけ(交換操作はしない)。
- 交換: **親ページで承認して消し込む**。対象の子の `points` から `cost` を差し引く(残高不足なら不可)。交換履歴 `settings.rewardLog = [{ date, profileId, name, cost }]` に記録(任意表示)。

## ③ モンスター進化(1段階)
- トリガー: **同じモンスターを3回捕獲すると進化**(2つ目の姿へ)。
- 進捗の持ち方を拡張: 現在 `progress[子].monsters: [id...]`(ユニーク) → **`captures: { id: 回数 }`** に変更。図鑑の所持種類数は `Object.keys(captures).length`、進化状態は `captures[id] >= 3` で判定。
- データ: `data/monsters.js` の各モンスターに `evolveName`(進化後の名前)・`evolveImg`(進化後画像パス)を追加。進化後の絵は各20体、Pollinationsで生成(プロンプト承認ゲート)。
- 表示: 図鑑は捕獲数と進化状態を表示。進化前は基本の姿、3回到達で進化後の姿に切替＋捕獲結果画面で「しんか!」演出(CSSアニメ)。
- 進化してもコレクションは1エントリ(同一idの段階違い)。

## ④ データ設計・スキーマ(v4)
- `progress[子]`: 既存 `{streak, lastPlayedDate, sessions}` に加え **`xp: 0`・`points: 0`・`captures: {}`** を追加。`monsters` 配列は廃止し `captures` に一本化(移行で変換)。
- `settings`: 既存 `{pin}` に **`rewards: []`・`rewardLog: []`** を追加。
- **SCHEMA_VERSION=4**。`load()` に移行を追加:
  - v3 → v4: 各 `progress` に `xp:0, points:0` を追加、`monsters:[...]` を `captures` に変換(`{id:1}` を各所持idに付与=既存所持は1回捕獲扱い)、`monsters` を削除。`settings` に `rewards:[], rewardLog:[]` を付与。**streak/sessions/図鑑は保持**。
  - v2 → v3(既存)→ 続けて v4 化されるよう、v2移行後の結果も v4 形へ通す(または v2→v4 を直接)。実装は「読み込んだ版に応じて順に持ち上げる」方式。
  - v1・破損 → defaultState。
- capture 表示や session 記録(`recordSession`)を captures/xp/points 加算に対応。
- 純粋関数を分離: `levelFromXp`(XP→レベル)は `js/progress-calc.js`、`recordSession` の拡張は state.js。

## 影響を受ける既存コード
- `js/state.js`: defaultState/recordSession/load(移行)拡張。
- `js/app.js`: 捕獲結果でXP/ポイント/進化の反映と演出、ホームのLv/ポイント表示、図鑑の進化表示、親ページにごほうび一覧管理＋交換。
- `data/monsters.js`: evolveName/evolveImg 追加。
- `js/capture.js` は変更不要(抽選はそのまま。捕獲回数の集計は state 側)。
- `sw.js`: 進化画像＋新jsを追加・CACHE更新。

## ファイル構成(追加・変更)
```
js/progress-calc.js   # levelFromXp・XP/ポイント加算・進化判定(純粋)
js/state.js           # defaultState/recordSession/load(v3→v4移行)拡張
js/app.js             # ホームLv/ポイント・図鑑進化・親ごほうび管理・しんか演出
data/monsters.js      # evolveName/evolveImg 追加
assets/evo-<id>.png   # 進化後モンスター20体(Pollinations生成)
sw.js                 # 進化画像・progress-calc.js 追加・CACHE更新
tests/*.test.mjs
```

## エラー・例外への備え
- 交換でポイント残高不足 → 交換不可(ボタン無効/警告)。負残高を作らない(テスト)。
- 進化画像が無い段階(生成前)でも進化状態は絵文字/基本画像でフォールバック(第1弾のface()方式)。
- 移行の冪等性: v4データを再度loadしても壊れない。captures変換で二重付与しない。
- XP/pointsは非負・整数を保つ(テスト)。

## テスト
- `progress-calc`: levelFromXp(境界: 0XP=Lv1, 100XP=Lv2直前/到達, 累積の単調性)、XP/ポイント加算、進化判定(captures>=3)。
- `state`: v3→v4移行(monsters→captures変換・xp/points/rewards付与・streak保持)、v4の冪等性、recordSessionがxp/points/capturesを正しく加算。
- ブラウザ: セッションでXP/ポイント増加・レベルアップ表示、同一モンスター3回で進化＋しんか演出、親ページでごほうび登録→交換でポイント減、図鑑の進化表示。オフライン動作。

## 作る順番
1. `progress-calc.js`(純粋)＋ state 拡張(v4移行・recordSessionのXP/ポイント/captures)＋テスト
2. ホーム表示(Lv・XPバー・ポイント残高)＋捕獲結果でのXP/ポイント反映
3. ごほうびポイント帳(親ページで一覧登録・交換消し込み、子は残高＋一覧表示)
4. 進化ロジック(3回で進化)＋図鑑の進化表示＋「しんか!」演出(この時点は絵文字/基本画像フォールバック)
5. 進化後モンスター20体の画像生成(**プロンプト承認ゲート**)＋monsters.jsへ組み込み＋sw更新
6. PWA更新・公開

## スコープ外(後続)
- 称号・バッジ(今回見送り。第3弾の別回)
- 英語・理科社会パック、Claude連携の完全フロー＋HTML手順書
- 2段階以上の進化
