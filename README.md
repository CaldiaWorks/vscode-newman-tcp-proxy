# vscode-newman-tcp-proxy

**VS Code extension for running Newman tests through an integrated TCP proxy**

Local Newman と VS Code を連携させ、TCP プロキシを経由して API テストを実行・検査するための拡張機能です。

## Features (Planned)

- **TCP Proxy Server**: VS Code 内で動作する軽量 TCP プロキシ
- **Traffic Inspection**: 通信内容（Request/Response）のリアルタイム表示
- **Newman Integration**: ローカルの Newman を実行し、プロキシ経由でトラフィックを捕捉

## Requirements

この拡張機能を使用するには、以下のツールが必要です。

- **Node.js**: v16 以上
- **Newman**: `npm install -g newman`

## Usage

1. コマンドパレットから `Newman Proxy: Start` を実行（予定）
2. Newman でテストを実行する際、プロキシ設定を利用（詳細は実装後に追記）

## License

MIT
