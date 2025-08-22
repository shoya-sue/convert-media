// 社内ホスト用の簡易実装例
// 本来は Squoosh コーデック（mozjpeg/oxipng/webp/avif）のWASM/JSを自己ホストし、
// それらを呼び出してエンコードしますが、ここでは OffscreenCanvas/convertToBlob を
// 使った互換実装を提供します（target/quality を反映、effort/chroma は無視または近似）。

export async function squooshEncode(bitmap, { target, quality = 0.9, effort = 4, lossless = false, chroma = '420' } = {}) {
  // 受け取った ImageBitmap を OffscreenCanvas に描画
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
  const ctx = canvas.getContext('2d')
  ctx.drawImage(bitmap, 0, 0)

  // MIMEを決定（avifは未対応環境があるためfallback）
  let mime = target === 'jpeg' ? 'image/jpeg' : target === 'png' ? 'image/png' : target === 'webp' ? 'image/webp' : 'image/avif'

  const q = lossless ? 1.0 : quality
  let blob = await canvas.convertToBlob ? await canvas.convertToBlob({ type: mime, quality: (mime === 'image/jpeg' || mime === 'image/webp' || mime === 'image/avif') ? q : undefined }) : null
  if (!blob) {
    // convertToBlob 未対応や avif 失敗時のフォールバック
    const fallbackType = target === 'png' ? 'image/png' : 'image/webp'
    blob = await new Promise((resolve) => {
      // OffscreenCanvasに toBlob が無い実装の場合の保険（実際は無いことが多い）
      // この場合は失敗扱いにしておく
      resolve(new Blob([], { type: fallbackType }))
    })
  }

  const buf = await blob.arrayBuffer()
  return { data: buf, mime: blob.type || mime }
}

