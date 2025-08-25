# ffmpeg.wasm配置手順

このディレクトリに ffmpeg.wasm の必要ファイルを配置してください。

## 必要ファイル

以下のファイルを配置する必要があります：

- `ffmpeg-core.js`
- `ffmpeg-core.wasm`
- `ffmpeg-core.worker.js`

## 入手方法

### 方法1: npmパッケージから取得

```bash
npm install @ffmpeg/ffmpeg @ffmpeg/core
```

その後、`node_modules/@ffmpeg/core/dist/` から必要ファイルをコピー：

```bash
# プロジェクトルートで実行
cp node_modules/@ffmpeg/core/dist/ffmpeg-core.js public/wasm/ffmpeg/
cp node_modules/@ffmpeg/core/dist/ffmpeg-core.wasm public/wasm/ffmpeg/
cp node_modules/@ffmpeg/core/dist/ffmpeg-core.worker.js public/wasm/ffmpeg/
```

### 方法2: CDNから直接ダウンロード

```bash
cd public/wasm/ffmpeg/

# 最新版のダウンロード（例: v0.12.x）
curl -o ffmpeg-core.js https://unpkg.com/@ffmpeg/core@0.12.6/dist/ffmpeg-core.js
curl -o ffmpeg-core.wasm https://unpkg.com/@ffmpeg/core@0.12.6/dist/ffmpeg-core.wasm
curl -o ffmpeg-core.worker.js https://unpkg.com/@ffmpeg/core@0.12.6/dist/ffmpeg-core.worker.js
```

## 配置完了の確認

配置後、以下のコマンドで確認できます：

```bash
ls -la public/wasm/ffmpeg/
```

次のような出力になれば成功です：

```
-rw-r--r--  1 user user  xxxxx ffmpeg-core.js
-rw-r--r--  1 user user  xxxxx ffmpeg-core.wasm
-rw-r--r--  1 user user  xxxxx ffmpeg-core.worker.js
```

## 注意事項

- これらのファイルは合計で数十MBになります
- `.gitignore`により Git には含まれません
- 本番環境でも同様に配置が必要です
- ファイルが配置されていない場合、動画機能は無効状態で表示されます

## ライセンス

ffmpeg.wasmのライセンスについては公式リポジトリを参照してください：
https://github.com/ffmpegwasm/ffmpeg.wasm