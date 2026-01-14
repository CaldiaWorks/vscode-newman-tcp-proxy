# Development Guide

`vscode-newman-tcp-proxy` の開発者向けドキュメントです。

## Prerequisites

- **Node.js**: v16 or higher
- **npm**: v8 or higher
- **Git**

## Setup

リポジトリをクローンし、依存関係をインストールします。

```bash
git clone <repository-url>
cd vscode-newman-tcp-proxy
npm install
```

> **Note**: 初期ディレクトリ名が `extention-tcp-newman` の場合は、`vscode-newman-tcp-proxy` にリネームすることを推奨します。

## Build & Debug

### Build

TypeScript のコンパイルを実行します。

```bash
npm run compile
```

### Debugging

1. VS Code でプロジェクトを開きます。
2. **F5** キーを押してデバッグを開始します。
3. 新しい VS Code ウィンドウ（Extension Development Host）が立ち上がります。

## Project Structure

- `src/`: ソースコード (TypeScript)
  - `extension.ts`: エントリーポイント
- `package.json`: 拡張機能のマニフェスト設定
- `.vscode/`: VS Code 設定（デバッグ構成など）
