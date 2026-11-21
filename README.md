# Cockpit Speedtest

Cockpit 上から Linux サーバー自体のインターネット通信速度（下り・上り・遅延）を測定するための Cockpit 拡張機能です。
バックエンドに Ookla Speedtest CLI を利用し、PatternFly 準拠の直感的な UI で測定や結果確認が行えます。
<img width="1919" height="892" alt="image" src="https://github.com/user-attachments/assets/a79e41ec-8d5a-4973-a13b-d4a5f48a58a5" />


## 特徴

- **サーバー直接測定**: ブラウザを閲覧しているクライアント環境ではなく、Cockpit が稼働しているサーバーの実効通信速度を計測
- **測定先の選択**: 最寄りの自動選択、または利用可能な測定サーバー一覧からの手動選択に対応
- **リアルタイム進捗**: 遅延・ダウンロード・アップロードの進行状況をインジケーターで可視化
- **測定履歴管理**: 過去の測定結果一覧の確認、個別削除や全件削除、結果URLへのアクセスに対応
- **保持件数の設定**: 保持する測定結果の最大件数（1〜1,000件）をカスタマイズ可能
- **タブ分割 UI**: 「測定」「測定履歴」「設定」のタブ構成で、操作と結果の確認を分離
- **PatternFly UI**: Cockpit 標準のデザインシステム（PatternFly 5）を採用し、ダークテーマにも対応
- **安全な設計**: シェルを介さないコマンド実行、入力値のバリデーション、明示的な利用規約同意フロー

## 前提条件

- Cockpit (version 276 以降)
- Ookla Speedtest CLI（コマンド名: `speedtest`）
  - Python 版の `speedtest-cli` など別実装は非対応です。`speedtest --version` の出力に `Ookla` が含まれることを確認してください。
  - `.deb` パッケージからのインストール時は自動的にセットアップされます。
  - 手動インストールの場合は公式手順を参照してください: https://www.speedtest.net/apps/cli

## インストール

### .deb パッケージから（Ubuntu 24.04）

GitHub Releases から最新の `.deb` パッケージをダウンロードしてインストールします。
Ookla Speedtest CLI は別途インストールしてください。Ubuntu 24.04 (noble) は
Ookla の Packagecloud APT リポジトリにReleaseファイルがないため、公式ページから
Linux 用アーカイブをダウンロードし、展開した `speedtest` を PATH の通った場所に配置します。
`speedtest --version` に `Ookla` が含まれることを確認してください。

```sh
sudo apt install ./cockpit-speedtest_*_all.deb
```

以前のバージョンでインストールに失敗した後、APT が `ookla_speedtest-cli` の
Release ファイルに関する警告を出し続ける場合は、
`/etc/apt/sources.list.d/ookla_speedtest-cli.list` の内容を確認してください。
このファイルが失敗した自動セットアップで作成されたOoklaの設定であることを確認できた場合に限り、
削除してから `sudo apt update` を実行してください。

### ソースコードから

Node.js (v20 以上) がインストールされている環境でビルドとインストールを行います。

```sh
# 依存関係のインストールとビルド
npm install
make build

# システム全体にインストール
sudo make install

# または開発用に現在のユーザー環境へリンク
make devel-install
```

インストール後、Cockpit のナビゲーションメニューに「Speed Test」が追加されます。

## 使い方

1. Cockpit のメニューから「Speed Test」を選択します。
2. 初回起動時は Ookla の利用規約およびプライバシーポリシーを確認し、同意を行ってください（自動同意は行われません）。
3. **「測定」タブ**:
   - 測定サーバーを選択（「自動選択」または一覧から指定）します。
   - 「測定を開始」をクリックすると計測が始まります。
   - 計測完了後、ダウンロード・アップロード速度、レイテンシ、測定先情報が表示されます（結果は自動的に履歴に保存されます）。
4. **「測定履歴」タブ**:
   - 過去の測定結果が一覧表示され、詳細情報や Speedtest.net の結果 URL を確認できます。
   - 件数が多い場合はページネーションで閲覧可能です。
   - 各結果の個別削除や、「履歴をすべて削除」で一括クリアが可能です。
5. **「設定」タブ**:
   - 測定結果を保持する最大件数（1〜1,000 件、デフォルト: 20 件）を変更して保存できます。上限を超えた古い測定結果は自動的に削除されます。

## 開発

```sh
npm install      # 依存パッケージのインストール
make build       # TypeScript / React のバンドル（dist/ を生成）
make check       # 型チェック (tsc) および単体テスト
make clean       # ビルド生成物の削除
make deb         # Ubuntu 向け .deb パッケージのビルド
```

### 技術スタック

- 言語: TypeScript, React 18
- UI コンポーネント: PatternFly 5 (`@patternfly/react-core`)
- バンドラー: esbuild
- テスト: Node.js 標準テストランナー (`node:test`)

## ライセンス

本プロジェクトは LGPL-2.1-or-later の下で公開されています。
詳細は [debian/copyright](debian/copyright) を参照してください。
