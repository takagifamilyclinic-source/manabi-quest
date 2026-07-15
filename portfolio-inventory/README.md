# 個人開発ポートフォリオ棚卸し

PC内に増えていく個人開発プロジェクト(アプリ / CLAUDE.mdプロジェクト / 指示書 / 試作)を
定期スキャンし、「**何を持っていて、どれが動いていて、どれが放置されているか**」の
カタログ(`PORTFOLIO.md`)を維持するためのツールキットです。

- 機械的な検出(フォルダ列挙・git最終更新・README/APIキー検査・前回差分)は `scan.py` が担当
- 一言説明や状態判断(🟢稼働中 / 🟡未運用 / 🔴未完成 / ⚫放置)は Claude Code が担当
- 運用ルールは [`CLAUDE.md`](./CLAUDE.md) に記載。Claude Code をこのフォルダで起動して「棚卸しして」と言うだけ

## セットアップ(初回だけ)

1. このフォルダ(`portfolio-inventory/`)を、PC内の好きな場所に置く
2. 設定ファイルを作る:

   ```bash
   cp config.example.yaml config.yaml      # Windows: copy config.example.yaml config.yaml
   ```

3. `config.yaml` を開き、`roots:` にスキャンしたい開発フォルダを書く(複数可)

`config.yaml` は個人のパスを含むため `.gitignore` 済みです(共有されません)。
`scan.py` は標準ライブラリのみで動きます。`PyYAML` が入っていれば使いますが、無くても
簡易パーサで `config.yaml` を読めます(`pip install pyyaml` は任意)。

## 使い方

### A. Claude Code で(推奨)

このフォルダで Claude Code を起動し、こう言うだけ:

> 棚卸しして

Claude が `CLAUDE.md` の手順に沿って `scan.py` を実行し、結果を調査して
`PORTFOLIO.md` を生成、チャットにサマリーと「要判断リスト」を報告します。

### B. スクリプト単体で(生データだけ欲しいとき)

```bash
python scan.py            # 検出して JSON を出力し、history/ に保存
python scan.py --pretty   # 人が読みやすい整形JSON
python scan.py --no-write # history に保存しない(お試し)
```

## 出力されるもの

| ファイル / フォルダ | 内容 |
|---|---|
| `PORTFOLIO.md` | 人が読むカタログ本体(Claude が生成・上書き) |
| `history/YYYY-MM-DD.json` | その日の生スナップショット。次回の差分比較に使う |
| `archive/` | 「アーカイブ」したプロジェクトの退避先(削除はしない) |

## 判定の考え方

- **状態**:`scan.py` は日付だけで判断できる ⚫放置(既定90日超) のみ付けます。
  🟢🟡🔴 は文脈が要るため Claude が判断します。
- **ドキュメント健全性**:README無し / セットアップ手順が見当たらない / APIキーらしき
  文字列(値はマスク表示)を警告します。**キー文字列そのものは出力しません。**
- 断定はしません。事実(90日未更新など)を伝え、再開 / 完了扱い / アーカイブの判断は
  あなたに委ねます。

## 運用のコツ

- 月1回まわすと習慣化しやすい
- 新しいアイデアに着手する前に一度まわし、「似たものを既に作っていないか」を確認する使い方も有効
