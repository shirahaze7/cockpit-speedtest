<!-- コントリビューター向けの開発手順・規約をまとめたドキュメント -->
# 開発ガイド

cockpit-speedtest の開発に必要な手順と約束事をまとめます。

## 前提

- Cockpit が動作する Linux サーバー（開発用に `make devel-install` で自分のユーザーへ導入できます）
- Ookla Speedtest CLI（コマンド名 `speedtest`）
- Node.js 20+ と npm

## セットアップ

```sh
git clone https://github.com/shirahaze7/cockpit-speedtest.git
cd cockpit-speedtest
npm install          # 依存パッケージのインストール
make build           # dist/ へバンドル
make devel-install   # ~/.local/share/cockpit/speedtest へシンボリックリンクを作成
make check           # 型チェックと単体テスト
```

## ブランチ運用

- `main` は常に動作する状態を保ちます。直接コミットせず、作業用ブランチからプルリクエストを作成してください。
- ブランチ名は `feat/<内容>`、`fix/<内容>`、`docs/<内容>` の形式にします（例: `feat/speedtest-v1`）。

## コミットメッセージ

- 日本語で書きます。
- 1行目は変更内容の要約にします（例: `Cockpit向け速度テスト拡張の初期実装を追加`）。
- 必要に応じて空行を挟み、本文で背景や理由を補足します。

## 変更時のチェック

- `make check` が通ることを確認してください（TypeScript の型チェック `tsc --noEmit`、`speedtestCore` の単体テスト）。
- アプリ本体のソースは `src/`、テストは `src/test/` に配置し、ビルド生成物 `dist/` は Git にコミットしないでください。パッケージ定義は `debian/` に置きます。
- GitHub Actions の「チェック」ワークフローが、push／プルリクエストのたびに Ubuntu 24.04 で `make check` と `.deb` のビルド確認（中身の検証付き）を自動実行します。赤くなったらまずそちらのログを確認してください。
- ロジックを変更した場合は `src/test/speedtestCore.test.ts` にテストを追加・更新してください。
- Cockpit の画面に影響する変更は、実機または開発環境の Cockpit で表示と測定の動作を確認してください。

## 方針

- 実装は TypeScript + React 18 + PatternFly 5（`@patternfly/react-core`）を基本とします。Cockpit 公式の拡張機能スタイルに準拠します。
- 画面から受け取った値をコマンドに渡すときは、必ず引数配列で `cockpit.spawn()` に渡し、シェルを介さないでください。

## リリース

- リリースは `v` ではじまるタグ（例: `v0.1.0`）を push すると GitHub Actions が作成します。Ubuntu 24.04 環境で `.deb` をビルドし、GitHub Release に添付します。
- タグを付ける前に `debian/changelog` へ新しいバージョンのエントリを追加してください。
- 手元で `.deb` をビルドする場合は `make deb`（debhelper が必要）を使います。
