# vscode-newman-tcp-proxy

[![Version](https://img.shields.io/visual-studio-marketplace/v/CaldiaWorks.vscode-newman-tcp-proxy)](https://marketplace.visualstudio.com/items?itemName=CaldiaWorks.vscode-newman-tcp-proxy)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/CaldiaWorks.vscode-newman-tcp-proxy)](https://marketplace.visualstudio.com/items?itemName=CaldiaWorks.vscode-newman-tcp-proxy)
[![Open VSX](https://img.shields.io/open-vsx/v/CaldiaWorks/vscode-newman-tcp-proxy)](https://open-vsx.org/extension/CaldiaWorks/vscode-newman-tcp-proxy)
[![Build Status](https://github.com/CaldiaWorks/vscode-newman-tcp-proxy/actions/workflows/publish.yml/badge.svg)](https://github.com/CaldiaWorks/vscode-newman-tcp-proxy/actions/workflows/publish.yml)
[![License](https://img.shields.io/github/license/CaldiaWorks/vscode-newman-tcp-proxy)](https://github.com/CaldiaWorks/vscode-newman-tcp-proxy/blob/main/LICENSE)

**VS Code extension for running Newman tests through an integrated TCP proxy**

Local Newman と VS Code を連携させ、TCP プロキシを経由して API テストを実行・検査するための拡張機能です。
Postman の機能限定版のような体験を VS Code 内で提供します。

## Features

- **TCP Proxy Server**: VS Code 内で動作する軽量 TCP プロキシサーバー。
- **Traffic Inspection**: 通信パケット（Request/Response）をリアルタイムでログ表示・検査可能。
- **Newman Integration**: ローカルの Newman CLI を拡張機能から直接実行し、プロキシ経由でテストを実施。

## Requirements

この拡張機能を使用するには、以下のツールが必要です。

- **Node.js**: v16 以上
- **Newman CLI**: `npm install -g newman` (パスが通っている必要があります)

## Usage

1. **Activate Extension**

   - コマンドパレット (`Cmd+Shift+P`) から `Newman TCP Proxy: Start Newman TCP Proxy` を実行します。
   - 専用のパネルが開きます。

2. **Start Proxy**

   - **Local Port**: プロキシサーバーがリッスンするポート (例: `9003`)
   - **Target Host**: 転送先ホスト (例: `127.0.0.1` または `example.com`)
   - **Target Port**: 転送先ポート (例: `8080` または `80`)
   - `Start Proxy` ボタンをクリックしてプロキシを開始します。

3. **Run Newman**

   - `Select...` ボタンから Postman Collection JSON ファイルを選択します。
   - `Run Collection` ボタンをクリックすると、Newman が実行されます。
   - Newman は自動的に起動中のプロキシ (`http://127.0.0.1:<LocalPort>`) を使用するように設定されます。

4. **Inspect Traffic**
   - プロキシを通過した通信ログが下部のパネルに表示されます。
   - ログには `CLIENT -> PROXY` や `TARGET -> PROXY` などの方向とデータ内容が表示されます。

## License

MIT
