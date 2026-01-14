# User Guide: Newman TCP Proxy

vscode-newman-tcp-proxy は、VS Code 上で TCP プロキシサーバーを立ち上げ、そのプロキシを通して Newman (Postman CLI) テストを実行・解析するためのツールです。

## 1. 準備

### 前提条件

- Node.js がインストールされていること。
- Newman がインストールされていること。
  ```bash
  npm install -g newman
  ```
  ターミナルで `newman -v` が実行できることを確認してください。

## 2. 拡張機能の起動

1. VS Code を開き、コマンドパレット (`Cmd/Ctrl + Shift + P`) を開きます。
2. `Newman TCP Proxy: Start Newman TCP Proxy` を入力し実行します。
3. `Newman TCP Proxy` というタイトルのパネルが表示されます。

## 3. プロキシの設定と起動

パネル上部の **Proxy Settings** でプロキシを設定します。

- **Local Port**: 拡張機能が待ち受けるポート番号 (デフォルト: `9000`)。
- **Target Host**: リクエストの転送先ホスト (デフォルト: `127.0.0.1`)。
- **Target Port**: 転送先サービスのポート (デフォルト: `8080`)。

設定を入力後、`Start Proxy` ボタンを押します。
成功するとステータスが `RUNNING` (緑色) に変わります。

> **Note**: プロキシ起動中は設定を変更できません。変更する場合は一度 `Stop Proxy` を押してください。

## 4. Newman テストの実行

パネル中段の **Newman Integration** セクションを使用します。

1. **Select...** ボタンをクリックし、実行したい Postman Collection ファイル (`.json`) を選択します。
2. パスが表示されたら、`Run Collection` ボタンをクリックします。

Newman がバックグラウンドで実行され、自動的に起動中のプロキシ経由でリクエストを送信します。
実行完了後、結果ログがトラフィックログに追加されます。

## 5. バイナリデータの送信機能

本プロキシは、HTTP リクエストを受け取り、ヘッダーを除去して**実効データ（Payload）のみ**をターゲット TCP サーバーに転送します。
以下の 3 つの送信モードをサポートしています。

### A. Raw Data 送信

通常のテキストやバイナリを送信する場合です。

- **ContentType**: `text/plain` または `application/octet-stream` など
- **Body**: そのまま送信したいデータ
- **挙動**: HTTP ヘッダーを除去し、Body 部分だけをそのままターゲットに送信します。

### B. HEX 文字列によるバイナリ送信

バイナリデータを HEX 文字列（16 進数）として JSON で記述して送信する場合です。

- **ContentType**: `application/json`
- **Body**: `{ "command": "HEX_STRING" }`
  - 例: `{ "command": "48656C6C6F" }` -> `Hello` というバイナリデータとして送信されます。
- **挙動**: `command` フィールドの値をデコードし、バイナリデータとしてターゲットに送信します。

### C. ファイルアップロード送信

ファイルをそのままバイナリとして送信する場合です。

- **ContentType**: `multipart/form-data`
- **Body**: form-data のファイルフィールド（キー名は任意、例: `file`）
- **挙動**: アップロードされたファイルの中身のみを抽出し、バイナリデータとしてターゲットに送信します。

> **Note**: ターゲットサーバーとの TCP 接続は、プロキシ起動時 (`Start Proxy`) に確立され、セッションはずっと維持されます。リクエスト毎に切断されることはありません。

## 6. トラフィックログの確認

パネル下部の **Traffic Log** に通信内容が表示されます。

- **CLIENT**: Newman やその他クライアントからの送信データ。
- **TARGET**: 転送先サーバーからの応答データ。
- **INFO**: システムメッセージ（接続開始/終了、エラーなど）。

`Clear` ボタンでログを消去できます。

## トラブルシューティング

- **Newman execution failed**: `newman` コマンドが見つからない可能性があります。PATH が通っているか確認してください。
- **Failed to start proxy**: 指定した Local Port が既に使用されている可能性があります。別のポートを試してください。
