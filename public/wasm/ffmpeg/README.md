# ffmpeg.wasm ファイル配置ガイド

このディレクトリには ffmpeg.wasm の実行に必要なファイルを配置してください。

## 必要なファイル

以下のファイルをこのディレクトリに配置する必要があります：

1. **ffmpeg-core.js** - ffmpeg.wasm のメインJavaScriptファイル
2. **ffmpeg-core.wasm** - WebAssemblyバイナリファイル
3. **ffmpeg-core.worker.js** - Workerスクリプトファイル

## 入手方法

### オプション1: npm パッケージから取得

```bash
# @ffmpeg/core パッケージをインストール
npm install @ffmpeg/core

# ファイルをコピー
cp node_modules/@ffmpeg/core/dist/umd/ffmpeg-core.js ./
cp node_modules/@ffmpeg/core/dist/umd/ffmpeg-core.wasm ./
cp node_modules/@ffmpeg/core/dist/umd/ffmpeg-core.worker.js ./
```

### オプション2: CDN から直接ダウンロード

```bash
# ffmpeg-core.js
curl -O https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js

# ffmpeg-core.wasm
curl -O https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.wasm

# ffmpeg-core.worker.js
curl -O https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.worker.js
```

### オプション3: 公式リリースから取得

[FFmpeg.wasm GitHub Releases](https://github.com/ffmpegwasm/ffmpeg.wasm/releases) から最新版をダウンロードしてください。

## ファイル配置後の確認

ファイルを配置した後、以下の構造になっていることを確認してください：

```
public/wasm/ffmpeg/
├── README.md (このファイル)
├── ffmpeg-core.js
├── ffmpeg-core.wasm
└── ffmpeg-core.worker.js
```

## 動作確認

1. 開発サーバーを起動：
   ```bash
   npm run dev
   ```

2. ブラウザで動画処理ページ（圧縮/変換/リサイズ）を開く

3. ffmpeg.wasm が正常に読み込まれていれば、動画処理機能が有効になります

## トラブルシューティング

### ファイルが読み込まれない場合

1. ファイル名が正確であることを確認
2. ファイルのパーミッションを確認（読み取り可能であること）
3. ブラウザの開発者ツールでネットワークエラーを確認

### CORS エラーが発生する場合

ローカル開発環境では通常問題ありませんが、本番環境では以下のヘッダーが必要な場合があります：

```
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Opener-Policy: same-origin
```

## ライセンス

ffmpeg.wasm は LGPL 2.1 ライセンスで提供されています。
詳細は [ffmpeg.wasm のライセンス](https://github.com/ffmpegwasm/ffmpeg.wasm/blob/main/LICENSE) をご確認ください。

## セキュリティ上の注意

- WASMファイルは信頼できるソースから取得してください
- 定期的に最新版へ更新することを推奨します
- 本番環境では整合性チェック（SRI）の使用を検討してください