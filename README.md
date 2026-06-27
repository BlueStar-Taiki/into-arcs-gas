# INTO-ARCS GAS

INTO-ARCS社のGoogle Apps Scriptを管理するリポジトリです。

## Projects

### star-photo-application

星空撮影イベント申し込みフォーム用GAS。

対象:
- Googleフォーム
- 回答スプレッドシート
- 申込管理シート
- Discord通知
- 確認メール送信

## Rules

- GASコードは `gas/` 以下で管理する
- シート構成は `setup` 関数で再現可能にする
- 秘密情報は Script Properties に保存し、GitHubには含めない
- `.clasp.json` はローカル専用でGit管理しない
