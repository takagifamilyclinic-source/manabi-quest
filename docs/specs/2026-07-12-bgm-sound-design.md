# まなびクエスト BGM／効果音 設計書

作成日: 2026-07-12
対象: こども向け学習アプリ「まなびクエスト」への BGM・効果音（SE）追加
再開コマンド: `/manabi`

## 目的・背景
- 「ドラクエ／ポケモンっぽい」音を付けて、学習をゲームらしく楽しくする。
- **著作権**: 実在曲は使わない。**あの雰囲気の完全オリジナル曲**を作る（RPGの冒険感・チップチューン風）。
- **課金ゼロ厳守**: AI作曲サービス・有料APIは使わない。**Web Audio API でブラウザ内合成**（音声ファイル不要・オフライン動作・$0）。
- まなびの方針に合致: buildless バニラJS（ESモジュール・依存ゼロ）・PWAオフライン・iPad単体。

## 決定した要件（ブレストで確定）
1. **音の雰囲気**: 8bit のキャッチーな主旋律（矩形波）＋やわらかい伴奏和音（丸い音）のミックス。
2. **曲構成（3曲）**: フィールド曲（普段の画面）／バトル曲（10問中）／勝利ジングル（クリア時・短い）。
3. **効果音（SE）**: 正解ピロン♪／不正解ブブッ／捕獲ファンファーレ↗／ボタンのポッ。
4. **ON/OFFと初期状態**: 初期ON。各画面（ホーム角）に🔊/🔇トグル。親ページに音量スライダー。設定は**端末に記憶**。
5. ブラウザの自動再生ブロックに対応し、**最初のユーザー操作（タップ）で鳴り始める**。

## アプローチ
**採用: Web Audio による手続き生成（データ駆動・純JS）。**
- オシレータ（8bit＝矩形波 `square`、伴奏＝三角/正弦 `triangle`/`sine`、打楽器＝短いノイズ）を、曲データ（音符の配列）にそって先読みスケジューラで鳴らす。
- 不採用: 音声ファイル同梱（作曲ツール必要・容量増・AI作曲は著作権/課金リスク）／音ライブラリ（Tone.js 等は依存ゼロ原則に反する）。

## アーキテクチャ（責務分離・3モジュール）
音の実体（ブラウザ専用）と、テスト可能な純ロジックを分ける。

### 1. `js/audio-util.js`（純ロジック・node --test 対象）
外部依存なし・`AudioContext`/`localStorage` に触れない純関数のみ。
- `noteToFreq(note: string): number` — `"A4" → 440`。等分平均律（A4=440基準）。音名は `C C# D … B` ＋オクターブ番号、休符は `"R"`（→ `0` を返す）。
- `trackForScreen(screenId: string): 'field'|'battle'|'victory'|null` — 画面IDから鳴らす曲を決める。
  - `#screen-battle` → `'battle'`
  - `#screen-result` → 呼び出し側がクリア/勝利のときのみ `'victory'` を使う（マッピング関数は「result は field 復帰が既定、勝利演出は別途 victory を一時再生」を表現するため、result は `'field'` を返し、勝利ジングルは結果描画時に `playTrack('victory')` を明示的に呼ぶ）。
  - それ以外（`#screen-home` `#screen-subject` `#screen-zukan` `#screen-badges` `#screen-profile` `#screen-parent` `#screen-reward`）→ `'field'`
  - 未知ID → `null`（何も変えない）
- `clampVolume(x: number): number` — `0..1` に丸める（NaN/範囲外を安全化）。
- `parseAudioSettings(raw: string|null): {muted:boolean, volume:number}` — localStorage文字列を安全にパース（壊れていれば既定 `{muted:false, volume:0.7}`）。volume は `clampVolume` 済み。

### 2. `js/audio-data.js`（曲・SE データ＝作曲はここだけ）
純データ（配列/オブジェクト）。作曲・調整はこのファイルだけを触る。
- テンポ（BPM）と、各曲 `field`/`battle`/`victory` の**トラック定義**：
  - `melody`: `[{n:'E5', d:1}, {n:'R', d:0.5}, …]`。`n`＝音名（休符は `'R'`）、`d`＝**拍数（beats）**。秒への変換は `秒 = d * 60 / BPM`（エンジン側で計算・データは拍で持つ）。矩形波。
  - `harmony`（任意）: 伴奏和音・丸い音（triangle/sine）。
  - `bass`（任意）: 低音（triangle）。
  - `loop: true`（field/battle）／`loop:false`（victory＝1回）。
- SE定義 `sfx`：`correct`（上昇2音ピロン♪）/`wrong`（下降ブブッ・短ノイズ）/`capture`（上昇アルペジオのファンファーレ）/`button`（極短のポッ）。
- **音域/尺の制約**（テストで検証）: 音名は `noteToFreq` が解釈できること、`d>0`、victory は数秒以内、loop 尺が妥当。

### 3. `js/audio.js`（エンジン・ブラウザ専用）
`AudioContext` を1つ持つシングルトン。公開API：
- `init()` — 最初のユーザー操作で遅延生成し `resume()`（自動再生ブロック解除）。多重呼び出し安全。
- `playTrack(name)` — 指定曲を（ループ）再生。同じ曲なら何もしない。切替時は前曲を止めて開始。
- `stopTrack()` — 現在の曲を停止（スケジューラ停止）。
- `playSfx(name)` — SEを1回鳴らす（BGMと同時可）。
- `setMuted(bool)` / `isMuted()` — マスターゲインを 0/通常 に（コンテキストは動かしたまま＝復帰が速い）。永続化。
- `setVolume(0..1)` — マスターゲイン設定。永続化（`clampVolume`）。
- 内部: `master`(GainNode=音量)→`destination`。`music` と `sfx` を別 Gain で束ねる。**先読みスケジューラ**（`setInterval` 約25ms、100ms先までにノートを `oscillator.start/stop`＋Gainエンベロープでスケジュール）でギャップレスにループ。各ノートは短命オシレータ＋ADSR（GainNode）でプチプチ音に。

## 状態・永続化（スキーマ非変更）
- 端末（アプリ）単位の設定なので、子の進捗 state（v5）には入れない。
- **別の localStorage キー `manabi-audio`** に `{muted, volume}` を保存。→ **state のスキーマ移行は不要**。
- 起動時に `parseAudioSettings(localStorage.getItem('manabi-audio'))` で復元し、エンジンに適用。

## 組み込み（app.js への最小限フック）
1. **初回タップ解除**: 一度きりの `pointerdown`（or `click`）リスナーで `audio.init()`。以降 `show()` の曲が鳴る。
2. **画面遷移で曲切替**: 既存の `show("#screen-…")` の中／直後に `const t = trackForScreen(id); if (t) audio.playTrack(t);` を1か所追加。
3. **勝利ジングル**: 結果画面でクリア（勝利）時に `audio.playTrack('victory')`、ジングル終了後にフィールド曲へ戻す（victory は `loop:false`、`onended` 相当で `playTrack('field')`）。
4. **SE**: バトルの正誤ハンドラで `playSfx('correct'|'wrong')`、捕獲時に `playSfx('capture')`、主要アクションボタンで `playSfx('button')`（鳴らしすぎない・最小限）。
5. **ホーム🔊/🔇トグル**: `renderHome()` に角ボタン追加 → `audio.setMuted(!audio.isMuted())` とアイコン更新。
6. **親ページ音量スライダー**: `renderParentDash()` に `<input type=range>` 追加 → `audio.setVolume(v)`。

## 英語🔊読み上げとの両立
- 英語の読み上げは `speechSynthesis`（別系統）。SEは短く競合しない。
- 読み上げ中のBGMダッキング（自動減衰）は**任意・今回スコープ外**（必要なら後日）。

## 省電力
- `visibilitychange` でタブ非表示時に `stopTrack()`、復帰時に現在画面の曲を再開（バッテリー節約）。

## エラー処理・堅牢性
- `AudioContext` 非対応/生成失敗時は**全APIを無操作**にフォールバック（アプリは無音で通常動作）。
- `localStorage` 例外は握りつぶし既定値。
- ミュートは gain=0（SE含め即無音）。二重 `init`/連打に耐える。

## テスト（`node --test` / `npm test`）
音の実体は node で鳴らせないため、**純ロジックをテスト**（`js/audio-util.js` と `js/audio-data.js`）：
- `noteToFreq`: `A4=440`、オクターブ/半音の代表値、`"R"→0`、未知入力の扱い。
- `trackForScreen`: 主要画面IDの期待マッピング（battle→battle、home/zukan等→field、未知→null）。
- `clampVolume`: 範囲外/NaN/境界。
- `parseAudioSettings`: 正常/壊れたJSON/欠損キー/範囲外volume。
- 曲データ妥当性: 全トラックの音名が `noteToFreq` で解釈可能・`d>0`・victory は `loop:false` かつ数秒以内・field/battle は `loop:true`。
- 音・UI の実挙動はブラウザ（chrome-devtools MCP＋一時 `_verify.html`）＋**実iPadで実聴**確認（検証後に一時ファイル削除）。

## 変更ファイル一覧
- 新規: `js/audio-util.js`・`js/audio-data.js`・`js/audio.js`・`test/audio-util.test.mjs`
- 変更: `js/app.js`（フック6点）・`css/style.css`（🔊トグル・音量スライダー）・`sw.js`（precache に3ファイル追加＋**CACHE `v1.10.0`→`v1.11.0`**）
- ドキュメント: 実装後に `docs/進捗.md`・メモリ・README を更新

## 曲の作風メモ（audio-data.js の作曲方針）
- フィールド: 明るく穏やかな冒険感（中庸テンポ・親しみやすい8小節ループ）。
- バトル: 少し速くわくわく疾走（緊張しすぎない）。
- 勝利ジングル: 短い上昇の高揚（2〜3秒）。
- すべて長調ベースで子ども向けに明るく。実在曲の旋律を写さない（オリジナル）。

## 非対象（YAGNI）
- 音声ファイル同梱・外部音源・音ライブラリ。
- 読み上げ中のダッキング、曲の動的生成（毎回変化）、複数曲プレイリスト。
