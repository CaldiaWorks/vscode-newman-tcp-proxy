# Deploy (Publish) Extensions

このドキュメントは、`vscode-newman-tcp-proxy` 拡張機能をマーケットプレイスへ公開（デプロイ）するための手順書です。
GitHub Wiki の「Deployment」ページ等としてお使いください。

## 前提条件 (Prerequisites)

公開作業を行う環境には、以下のツールとトークンが必要です。

### 1. ツールのインストール

```bash
# VS Code Marketplace 用
npm install -g @vscode/vsce

# Open VSX Registry 用
npm install -g ovsx
```

### 2. Personal Access Token (PAT) の準備

セキュリティ上の理由から、トークンはリポジトリにはコミットせず、実行時に指定するか環境変数を使用してください。

| 対象サービス            | 必要なトークン   | 取得方法                                                                                                      |
| :---------------------- | :--------------- | :------------------------------------------------------------------------------------------------------------ |
| **VS Code Marketplace** | Azure DevOps PAT | [dev.azure.com](https://dev.azure.com) > User Settings > Personal access tokens (Scope: Marketplace - Manage) |
| **Open VSX Registry**   | Open VSX Token   | [open-vsx.org](https://open-vsx.org/user-settings/tokens) > Generic Access Tokens                             |

---

## 公開手順 (Publishing Workflow)

### 1. バージョンの更新

公開する前に `package.json` のバージョンを更新します。

```bash
# パッチバージョンを上げる (0.0.1 -> 0.0.2)
npm version patch

# またはマイナーバージョン (0.1.0 -> 0.2.0)
# npm version minor
```

### 2. VS Code Marketplace への公開

Visual Studio Marketplace (Microsoft) へ公開します。

```bash
# PATを直接指定する場合
npx vsce publish -p <YOUR_AZURE_PAT>
```

成功すると、数分後に [Maketplace](https://marketplace.visualstudio.com/items?itemName=CaldiaWorks.vscode-newman-tcp-proxy) に反映されます。

### 3. Open VSX への公開

Open VSX Registry (VSCodium, Gitpod 等) へ公開します。

```bash
# PATを直接指定する場合
npx ovsx publish -p <YOUR_OPENVSX_TOKEN>
```

成功すると、即座に [open-vsx.org](https://open-vsx.org/extension/CaldiaWorks/vscode-newman-tcp-proxy) に反映されます。

---

## トラブルシューティング

### 認証エラー (401/403)

- トークンの権限（Scope）が不足していないか確認してください。
- Azure DevOps の場合、Organization が "All accessible organizations" になっているか確認してください。

### Organization エラー

- Open VSX で `CaldiaWorks` Namespace の所有権がないと言われる場合、[設定画面](https://open-vsx.org/user-settings/namespaces)で Namespace に参加しているか確認してください。

---

## 自動デプロイ (CI/CD with GitHub Actions)

GitHub Actions を設定済みです。Git タグをプッシュすることで自動的に公開・デプロイが行われます。

### 1. Secrets の設定

リポジトリの **Settings** > **Secrets and variables** > **Actions** > **New repository secret** から、以下のシークレットを登録してください。

| Secret Name | Value            | Description                            |
| :---------- | :--------------- | :------------------------------------- |
| `VSCE_PAT`  | Azure DevOps PAT | VS Code Marketplace 用トークン         |
| `OVSX_PAT`  | Open VSX Token   | Open VSX 用トークン (使用する場合のみ) |

### 2. リリース手順

バージョンを上げてタグをプッシュするだけで、あとは自動で処理されます。

```bash
# 1. バージョン更新 (package.json 等が更新され、Gitコミット＆タグ作成されます)
npm version patch
# または npm version minor / npm version major

# 2. タグのプッシュ (これがトリガーになります)
git push origin --tags

# 3. リポジトリへのプッシュ (version upコミットの反映)
git push origin main
```

Actions タブで進行状況を確認できます。
