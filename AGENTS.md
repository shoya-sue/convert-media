# Repository Guidelines

## プロジェクト構成 / モジュール方針
- フロントエンド専用: Vite + React + TypeScript（SPA）。バックエンド/外部SaaSは使用しない。
- 主要ディレクトリ
  - `src/app.tsx`: レイアウトとルーティング定義
  - `src/main.tsx`: エントリ（React + Router）
  - `src/components/`: 共有UI（Sidebar/Dropzone/ProgressBar）
  - `src/routes/`: 機能ページ（`image/*`, `video/*`）
  - `src/styles/`: グローバルスタイル（CSS Modules 可）
  - `public/wasm/`: 将来導入する WASM（ffmpeg.wasm/Squoosh）配置先

## 開発/ビルド/実行コマンド
- `pnpm dev`（または `npm run dev`）: 開発サーバ起動
- `pnpm build`: 本番ビルド（出力: `dist/`）
- `pnpm preview`: ビルド成果物のローカル配信

## コーディング規約 / 命名
- TypeScript: `strict`, `noImplicitAny`, `strictNullChecks` を有効。
- Lint/Format: ESLint + Prettier（2スペース、シングルクォート）。
- 命名: ファイル`kebab-case`、コンポーネント/型`PascalCase`、変数/関数`camelCase`。
- 設計: 1ページ=1機能を厳守。副作用は専用Hookに分離、UIは小さく純粋に。
- アーキテクチャ: すべてブラウザ内で処理。ユーザーファイルはサーバへ送信・保存しない。

## テスト方針
- 推奨: Vitest + React Testing Library（将来導入）。
- 対象: フォーム検証（Zod）、引数ビルダー、Dropzone/ProgressBar の基本挙動。
- 形式: `*.test.ts(x)` をソース近傍または `tests/` に配置。

## コミット / PR ガイドライン（日本語）
- コミットメッセージ: Conventional Commits に準拠。
  - 例: `feat: 画像圧縮ページの設定フォームを追加` / `fix: Dropzoneで複数選択時のバグ修正`
  - 本文: なぜ/何を/どの範囲かを簡潔に。英語不要。
  - 禁止: `Co-authored-by` 等の共同署名行は付与しない。
- PR: 目的・変更点・確認手順・UI変更はスクリーンショットを添付。READMEの方針（フロントのみ・外部サービス不使用・WASMは`public/wasm/`）に反しないこと。

コミットテンプレート設定例（任意）
```
git config commit.template .gitmessage
```

## 追加メモ（README整合）
- ページ: `image/{compress,convert,resize}`, `video/{compress,convert,resize}`。
- 依存は最小限に保つ。WASMは各ページで遅延読込し、不要な送信/保存を行わない。

## ツール/スタイル（遵守事項）
- Lint: `pnpm lint` / 自動修正は `pnpm lint:fix`
- Format: `pnpm format` / 確認は `pnpm format:check`
- 設定ファイル: `.eslintrc.cjs`, `.eslintignore`, `.prettierrc`, `.prettierignore`, `.editorconfig`

## 作業フロー（必須ルール）
- 実装 → ローカルでの動作確認（ビルド/簡易テスト含む）→ コミット → READMEの該当箇所を更新。
  - 例: `npm run dev` で画面確認、`npm run test` で単体テスト通過を確認。
  - コミットは日本語の Conventional Commits に従い、変更点と理由を明記。
  - READMEの変更がない場合でも、仕様に影響があれば必ず追記/修正すること。
