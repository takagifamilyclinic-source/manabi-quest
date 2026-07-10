# 第6弾(その1) 設計書：英語パック（全学年・読み上げ付き4択）

日付: 2026-07-10
対象: 第5弾その2公開済み（sw v1.6.1・schema v5・テスト116件・master=4170f4b）の続き。
本体: `D:\Desktop-Archive\manabi-quest`

## 目的

第3の教科「えいご」を全学年（1〜4年）に追加する。単語の4択（英→日・日→英）＋iPad内蔵音声での
読み上げ。既存のバトル・捕獲・XP・苦手自動調整・バッジの仕組みにそのまま乗せる。

## 決定事項

- 対象=全学年（理科・社会は3・4年のみで**次弾**。今回は英語のみ）。
- 形式=4択＋🔊読み上げボタン（`speechSynthesis`・iPad内蔵・無料・外部API/音声ファイルなし）。
- 語数=**学年60語×4＝240語**（出発点。後から追加可能）。
- 教科バッジの新設はしない。ただし**バッジの算数カウント修正は今回必須**（下記⑤）。

## ① データ（`data/english/g1.js`〜`g4.js`）

- 各エントリ: `{ word: "apple", kana: "アップル", meaning: "りんご", category: "くだもの" }`
  - `word`: 小文字英字（あいさつ等は "good morning" のようにスペース可）
  - `kana`: 読み方のカタカナ（1・2年の補助表示用）
  - `meaning`: こども向けの短い日本語（4択の選択肢になる）
  - `category`: 出題テーマ（データ整理用・妥当性テストで使用）
- 学年別テーマ（各60語）:
  - g1: 色・数(1〜10)・動物・果物・あいさつ
  - g2: 食べ物・飲み物・身の回りの物・家族・天気
  - g3: 文房具・スポーツ・曜日・月・体の部位（学校の外国語活動の定番語彙に寄せる）
  - g4: 教科・場所(town)・動作の言葉・時刻/一日・季節と行事
- **出典照合**: meaning は英和辞書と照合してから収録（捏造しない）。収録後に
  抜き取り照合レビュー（ランダム30語をWeb辞書でWebFetch照合）＋機械妥当性テスト
  （word形式・meaning非空・学年内でword/meaning重複なし・60語ちょうど）。

## ② 出題（`js/english-quiz.js`・kanji-quiz.jsと同じ流儀の純関数）

- `englishSkills(grade)` → `["eng-mean-g<g>", "eng-word-g<g>"]`
- `makeEnglishQuestion(skillTag, rng)`:
  - `eng-mean-g*`（英→日）: 「apple の いみは どれ?」choices=日本語meaning4択。
    問題オブジェクトに `speak: "apple"` を付与（読み上げ対象）。
    1・2年は問題文に kana を併記（「apple（アップル）の いみは どれ?」）。
  - `eng-word-g*`（日→英）: 「『りんご』を えいごで いうと?」choices=英単語4択。
    **speakは付けない**（読み上げると正解がバレるため）。
  - ダミーは同学年の他語から重複なしで3つ（kanji-quizの`sampleUnique`と同等ロジック）。
  - `explanation`: `apple（アップル）= りんご`。
- `subject: "english"`。

## ③ 読み上げ（`js/app.js`）

- `renderQuestion()` で `qn.speak` があり `"speechSynthesis" in window` のとき、
  問題文の横に 🔊 ボタンを表示。タップで発音（タップ=ユーザー操作なのでiOS制約もクリア）:
  ```js
  const u = new SpeechSynthesisUtterance(qn.speak);
  u.lang = "en-US";
  const en = speechSynthesis.getVoices().find((v) => v.lang.startsWith("en"));
  if (en) u.voice = en;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
  ```
- 音声APIが無い環境ではボタン自体を出さない（機能はそのまま使える）。
- 連打対策に `speechSynthesis.cancel()` を先に呼ぶ。

## ④ UI（教科えらび・セッション）

- `renderSubject()` に「🗣️ えいご」ボタンを追加（全学年）→ `startBattle("english")`。
- `js/session.js`: `skillsFor` に `if (subject === "english") return englishSkills(grade);`、
  `make` の分岐に english を追加。苦手自動調整（weightBySkill）は skillTag ベースなのでそのまま効く。

## ⑤ バッジの教科判定修正（`js/badges.js`・必須の整合修正）

- 現状 `correctCount(attempts, profileId, isKanji)` は「kanji-以外＝算数」なので、
  eng- の正解が「さんすう100もん」に算入されてしまう。
- `subjectOfTag(skillTag)` を導入: `kanji-*`→"kanji" / `eng-*`→"english" /
  `sci-*`→"science" / `soc-*`→"social"（次弾予約）/ それ以外→"math"。
  math/kanji バッジの `cur` はこの判定でカウント（**既存の獲得状況は変わらない**＝
  既存attemptsのタグは kanji-* と算数系のみのため）。
- 英語バッジ（eng-100等）の新設は今回しない（バッジ21種のまま）。

## ⑥ PWA・公開

- `sw.js`: ASSETS に `./js/english-quiz.js`・`./data/english/g1.js`〜`g4.js` を追加し
  CACHE を **v1.7.0** へ。
- schema変更なし（成績はskillTagキーで自動追加・移行不要）。
- テスト: english-quiz生成（4択・正解含有・重複なし・speak付与規則）、データ妥当性
  （60語×4・形式・重複なし）、badges の subjectOfTag（eng-がmathに算入されない回帰）。
  既存116件維持。
- 公開手順は従来どおり（ブランチ→レビュー→マージ→push→live確認）。
- 実機確認推奨: iPadで🔊の発音を一度確認（音声はOS依存のため）。

## 守るルール（再掲）

- 課金ゼロ（音声=iPad内蔵・画像なし・GitHub無料枠のみ）。
- 事実データ（単語の意味）は辞書照合・捏造しない＋抜き取りレビュー。
- JS/データ変更のため sw CACHE を上げる。既存ユーザーの進捗を消さない。
