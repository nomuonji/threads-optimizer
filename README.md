# Threads Optimizer

SNSアカウントの投稿管理・最適化システム

## 機能

### コア機能
- **アカウント管理**: 複数のThreads/Xアカウントを管理
- **投稿生成**: Gemini AIを使用した自動投稿生成
- **自動投稿**: スケジュールベースの自動投稿機能
- **投稿履歴同期**: 過去の投稿を同期してパフォーマンスを分析

### アカウント設定
各アカウントには以下の設定が可能:
- **Concept**: アカウントのコンセプト・ペルソナ設定
- **Auto-posting**: 自動投稿の有効/無効
- **AI Optimization**: 自己改善システムの対象設定（新規追加）
- **Post Schedule**: 投稿スケジュール設定
- **Post Length**: 投稿の最小/最大文字数
- **R18 Mode**: Grokを使用した成人向けコンテンツ生成

## 開発

```bash
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000) でアクセス

## 環境変数

`.env.example` を参考に `.env` ファイルを作成:
- Firebase Admin SDK 認証情報
- Gemini API Key
- その他プラットフォーム認証情報
