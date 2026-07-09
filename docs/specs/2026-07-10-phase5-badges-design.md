# 第5弾(その1) 設計書：称号・バッジ

日付: 2026-07-10
対象: 第1〜4弾その1公開済み（https://takagifamilyclinic-source.github.io/manabi-quest/ ・sw v1.5.0・schema v4・テスト97件・master=91247b3）の続き。
本体: `D:\Desktop-Archive\manabi-quest`

## 目的

達成の見える化でやる気を強化する。条件達成で**バッジ**が自動でもらえ（バッジ帳で収集）、
獲得済みバッジから1つを**称号**として選んでホームの名前の横に表示できる。

## 決定事項

- **形**: バッジ収集＋称号えらび（A案）。
- **実装方式**: **導出方式**。バッジは保存せず、現在の進捗から純関数でその場計算する。
  過去のがんばりに自動でさかのぼって付与され、獲得日時は持たない（子どもには不要）。
  保存するのは `bestStreak`（最高連続日数）と `title`（選んだ称号のバッジID）の2つのみ。
- **アイコン**: 全て emoji。画像生成なし（課金ゼロ・アセット追加なし）。

## ① バッジ定義（全21種）

判定材料は既存stateから導出できるものだけを使う:
`progress[子] = { streak, bestStreak(新設), captures{id:回数}, sessions, xp, points, title(新設) }`、
`state.attempts[] = {profileId, skillTag, correct, date}`（1問ごと・剪定なし）、モンスター定義20体。

| ID | 名前(こども向け) | emoji | 条件（導出元） |
|---|---|---|---|
| streak-3 | れんぞく3日 | 🔥 | bestStreak >= 3 |
| streak-7 | れんぞく7日 | ⚡ | bestStreak >= 7 |
| streak-14 | れんぞく14日 | 🌟 | bestStreak >= 14 |
| streak-30 | れんぞく30日 | 👑 | bestStreak >= 30 |
| level-3 | Lv3とうたつ | 🌱 | levelFromXp(xp) >= 3 |
| level-5 | Lv5とうたつ | 🌿 | levelFromXp(xp) >= 5 |
| level-10 | Lv10とうたつ | 🌳 | levelFromXp(xp) >= 10 |
| level-20 | Lv20とうたつ | 🏔️ | levelFromXp(xp) >= 20 |
| zukan-5 | モンスター5たい | 🐣 | ownedCount(captures) >= 5 |
| zukan-10 | モンスター10たい | 🐥 | ownedCount(captures) >= 10 |
| zukan-15 | モンスター15たい | 🦅 | ownedCount(captures) >= 15 |
| zukan-20 | ずかんコンプ | 🎓 | ownedCount(captures) >= 20 |
| evolve-1 | はじめてのしんか | ✨ | 進化済み(捕獲3回以上)が1体以上 |
| evolve-20 | ぜんぶしんか | 💎 | 進化済みが20体 |
| battle-10 | バトル10かい | 🥉 | sessions >= 10 |
| battle-50 | バトル50かい | 🥈 | sessions >= 50 |
| battle-100 | バトル100かい | 🥇 | sessions >= 100 |
| math-100 | さんすう100もん | ➗ | 算数の正解数(attempts: skillTagがkanji-以外※かつcorrect) >= 100 |
| math-500 | さんすうはかせ | 🧮 | 同 >= 500 |
| kanji-100 | かんじ100もん | ✏️ | 漢字の正解数(attempts: skillTagがkanji-*かつcorrect) >= 100 |
| kanji-500 | かんじはかせ | 📚 | 同 >= 500 |

※算数のskillTagはプレフィックスが複数あるため「kanji-で始まらないもの」を算数として数える
（現行の教科は算数/漢字の2つのみ。将来教科が増えたら定義を見直す）。

- しきい値は定数としてバッジ定義テーブル（`data/badges.js` または `js/badges.js` 内）に一元化。
- attempts は剪定されない実装（確認済み）なので教科バッジのカウントは安定。
  親ページのリセットは全消し＝バッジも消える（一貫した挙動として許容）。

## ② バッジ帳と称号えらび

- ホームに「バッジちょう」ボタンを新設（図鑑ボタンの並び）。
- バッジ帳ページ: 21種をグリッド表示。
  - 獲得済み: emoji＋名前を表示。タップ →「しょうごうにする」（title にバッジIDを保存）。
    現在の称号には「そうびちゅう」的なマークを表示。もう一度タップで外せる（title=null）。
  - 未獲得: シルエット（グレー・🔒等）＋条件と「あと○○」の進捗表示
    （例: 「バトル50かい あと12かい」）。次の目標が見える。
- ホームの名前の横に選択中の称号を表示（例: 「🔥れんぞく3日 たろう」）。
  称号未選択なら名前のみ（従来どおり）。

## ③ 新規獲得の演出

- バトル結果画面で、セッション記録**前後**のバッジ集合の差分を計算し、
  新規獲得があれば「バッジかくとく!」演出（既存「しんか!」のglow演出パターンを流用。
  emoji＋バッジ名を表示）。複数同時獲得にも対応（並べて表示）。
- 導出方式なので「未通知の獲得」を保存する必要はない。結果画面の差分検出のみ。
  （アプリ外で条件を満たすことはないため取りこぼしなし。）

## ④ データ・スキーマ移行

- **schema v4 → v5**:
  - `progress[子].bestStreak` を新設。移行時は現在の `streak` をコピー（過去の最高値は
    記録がないため現在値で初期化。以後 `recordSession` で `bestStreak = max(bestStreak, 新streak)` を維持）。
  - `progress[子].title` を新設（初期 null）。
- v2→v3→v4→**v5** の段階移行を維持（公開中のため既存の図鑑・XP・ポイント・成績を保持）。
- 移行は冪等（複数回適用しても壊れない）。

## ⑤ コード構成

- `js/badges.js`（新規・純関数）: バッジ定義テーブル＋
  `earnedBadges(progress, attempts, profileId): Set<badgeId>`＋
  `badgeProgress(badgeId, ...): {current, target}`（「あと○○」表示用）＋
  `newBadges(before, after): badgeId[]`（差分）。node --test でTDD。
- `js/progress-calc.js` の `levelFromXp` / `ownedCount` / `isEvolved` を再利用（重複実装しない）。
- `js/state.js`: v5移行＋ `recordSession` に bestStreak 更新＋ `setTitle(state, profileId, badgeId|null)`。
- `js/app.js`: バッジ帳ページ・ホームの称号表示・結果画面の獲得演出。
- `css/style.css`: バッジグリッド・シルエット・獲得演出のスタイル。
- `sw.js`: ASSETS に `js/badges.js` を追加し CACHE を **v1.6.0** へ。

## ⑥ テスト・検証・公開

- 純ロジック（badges.js の判定・進捗・差分、v5移行、bestStreak更新）は node --test でTDD。
  既存97件は維持。
- ブラウザ検証: バッジ帳の表示（獲得/未獲得/あと○○）、称号の装着と名前横表示、
  バトル結果の「バッジかくとく!」演出、既存進捗が消えていないこと（v4→v5移行）。
- 公開手順は従来どおり: 作業ブランチ→npm test緑→masterマージ(--no-ff)→push→live確認。

## 守るルール（再掲）

- 課金ゼロ（画像生成なし・emoji のみ・GitHub無料枠のみ）。
- スキーマ変更(v5)は段階移行を実装し、既存ユーザーの進捗を消さない。
- JS/データ変更のため sw.js の CACHE を v1.6.0 へ。
- バッジ名・条件などに事実データは含まれない（出典照合は不要）。
