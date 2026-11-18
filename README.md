# Cockpit向けインターネット速度テスト拡張

## 概要

Cockpitの画面から、Cockpitを動かしているLinuxサーバー自身のインターネット回線速度を測定する拡張機能です。測定先サーバーを選択して、ダウンロード速度、アップロード速度、遅延を確認できます。

## 目的

- サーバー自身からインターネットへの通信速度をCockpit上で手軽に確認する
- 測定先を選択可能にし、特定の測定先を使った比較を可能にする
- 測定中の状態と結果をCockpitの画面で分かりやすく表示する

## 対象範囲

測定するのは、Cockpitを動かしているサーバーからインターネット上の測定先までの通信速度です。

以下は対象外です。

- Cockpitを閲覧しているPC自身のインターネット速度
- LAN内の端末間の通信速度

## 基本機能

- 測定先サーバーの一覧を取得して表示する
- 利用者が測定先を選択できる
- 測定先の自動選択モードを用意する
- 選択した測定先を使って速度測定を開始する
- 測定結果をCockpitの画面に表示する
- 測定中は進行状況を表示し、測定の重複実行を防ぐ

## 測定結果

次の情報を表示します。

- ダウンロード速度
- アップロード速度
- 遅延
- 測定先の名前
- 測定先の運営元
- 測定日時

## 測定方式

- サーバー上でLinux用のOokla Speedtest CLIを実行する
- CLIの機械処理向け出力を利用し、結果をCockpitの画面に表示する
- 測定先一覧を取得し、選択された測定先を指定して測定する
- Ookla Speedtest CLIが未導入の場合は、導入が必要であることを画面に案内する

## エラーと状態の案内

以下の場合、原因と利用者が取れる対応を分かりやすく表示します。

- Ookla Speedtest CLIがインストールされていない
- 測定先一覧を取得できない
- 選択した測定先へ接続できない
- Ooklaの利用条件への同意が済んでいない
- 測定に失敗した、または途中で中断された

## 利用条件と権限

- Ooklaの利用条件や必要な同意を、利用者が確認してから進められるようにする
- 利用者の明示的な操作なしに利用条件へ同意しない
- 測定に必要な範囲でCockpitの権限を利用する
- 画面から受け取った値をコマンド引数として渡す際は、安全に処理する

## 初期版の完了条件

- Cockpit上で測定先一覧を表示し、測定先を選べる
- 自動選択と手動選択の両方で測定を開始できる
- ダウンロード速度、アップロード速度、遅延、測定先、測定日時を表示できる
- 測定中の状態が分かり、重複実行が防止される
- CLI未導入、同意未完了、通信失敗などを画面上で説明できる
- 対象がサーバー自身からインターネット上の測定先までの通信であることが明確に示される

## 実装方針

- **実装言語**: Vanilla JavaScript（ビルド工程なし）。Cockpit が提供する `cockpit.js` の `cockpit.spawn()` でサーバー上の Ookla Speedtest CLI を実行します。React や webpack を使わないため、インストールはファイルのコピーだけで済みます。
- **GUI**: Cockpit の標準デザイン（PatternFly）に寄せた単一画面の日本語 UI です。PatternFly 本体の CSS が読み込めない環境でも、`index.css` のみで表示が崩れないようにしています。
- 測定・パースなどの純粋なロジックは `src/main/speedtest.js` に分離し、Node.js の標準テストランナーで単体テストしています（`make check`）。

### ファイル構成

ソースは `src/` 配下にまとめ、トップレベルには置きません。本体は `src/main/`、テストは `src/test/` に分けます。インストール時に `src/main/` の中身が `/usr/share/cockpit/speedtest/` へフラットに配置されます（Cockpit のパッケージ配置形式）。

| ファイル | 役割 |
| --- | --- |
| `src/main/manifest.json` | Cockpit へ拡張を登録するマニフェスト（メニュー表示名は「Speed Test」） |
| `src/main/index.html` | 画面の構造 |
| `src/main/index.js` | 画面制御と CLI の実行（`cockpit.spawn()`、引数配列形式） |
| `src/main/speedtest.js` | サーバー一覧・JSONL 出力のパース、速度換算、エラー分類 |
| `src/main/index.css` | PatternFly 風のスタイル |
| `src/test/speedtest.test.js` | `src/main/speedtest.js` の単体テスト |
| `debian/` | Ubuntu 24.04 向け .deb パッケージ定義 |
| `.github/workflows/` | テスト／.deb ビルド確認と Release の自動化 |
| `Makefile` | インストール／開発用導入／チェック／.deb ビルド |
| `CONTRIBUTING.md` | 開発手順と約束事 |

## インストール

前提: Cockpit が動作しているサーバーに、Ookla Speedtest CLI（コマンド名 `speedtest`）を導入しておくこと。未導入の場合は画面に案内が表示されます。

### Ubuntu 24.04 向け .deb（GitHub Release から）

GitHub の Releases で配布する `.deb` を使う方法です。

```sh
sudo apt install ./cockpit-speedtest_0.1.0-1_all.deb
```

`speedtest`（Ookla Speedtest CLI）は Ubuntu の標準リポジトリに含まれないため、このパッケージでは Depends ではなく Recommends にしています。未導入の場合は Ookla の公式配布ページ（`https://www.speedtest.net/apps/cli`）の手順で別途導入してください。

### ソースから

システム全体へ導入する場合:

```sh
sudo make install
```

開発用に、現在のユーザーの Cockpit へシンボリックリンクで導入する場合:

```sh
make devel-install
```

導入後、Cockpit のメニューに「Speed Test」が表示されます。

## 使い方

1. Cockpit で「Speed Test」を開きます。画面上部に、測定対象が「Cockpit を動かしているサーバー自身からインターネット上の測定先まで」であることが表示されます。
2. 初回は Ookla の利用条件とプライバシー方針を確認し、チェックを入れて「同意して続ける」を押します。この画面が自動で同意することはありません。同意した場合のみ、CLI へ `--accept-license --accept-gdpr` が渡されます。
3. 測定先を選びます。「自動選択（最も近い測定先）」か、一覧から手動で選択できます。一覧は「一覧を更新」で再取得できます。
4. 「測定を開始」を押します。測定中は進行状況（遅延／ダウンロード／アップロード）が表示され、重複実行は防止されます。「中断」で止めることもできます。
5. 完了すると、ダウンロード速度、アップロード速度、遅延、測定先の名前、運営元、測定日時（結果 URL がある場合はそのリンク）が表示されます。

## 仕組みと安全性

- 測定先一覧: `speedtest --servers --format=json` を実行し、JSON 形式でパースします（JSON で返らない CLI の場合は人間向け形式のフォールバックパースを行います）。
- 測定: `speedtest --format=jsonl --progress=yes [--server-id <ID>]` を実行し、JSONL の進行イベントで画面を更新しながら、最終結果（`type: "result"`）を表示します。速度は CLI が返す bytes/sec を Mbps に換算しています。
- コマンドは必ず引数の配列で `cockpit.spawn()` に渡し、シェルを介しません。画面から受け取る測定先 ID は数字のみ（最大10桁）を検証してから渡します。
- 権限は `cockpit.spawn(..., { superuser: "try" })` の範囲で利用します。
- エラーは「CLI 未導入」「利用条件への同意が未完了」「測定先への接続失敗」「その他の失敗／中断」に分類し、原因と利用者が取れる対応を画面に表示します。詳細は画面下部の「詳細ログ」で確認できます。

## 開発

```sh
make check   # JS の構文チェック、単体テスト、マニフェストの JSON 検証
make deb     # Ubuntu 24.04 向け .deb のビルド（debhelper が必要。成果物は1つ上のディレクトリに出力）
```

## リリース手順

1. `debian/changelog` に新しいバージョンのエントリを追加します。
2. `main` へマージ後、`v0.1.0` のように `v` ではじまるタグを作成して push します。
3. GitHub Actions（`.github/workflows/release.yml`）が Ubuntu 24.04 環境で `make check` と `.deb` のビルドを行い、`.deb` とソース tarball、SHA256 チェックサムを添付した GitHub Release を作成します。

手動実行（workflow_dispatch）ではビルドと成果物のアップロードのみを行い、Release は作成しません。
