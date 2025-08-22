// Squooshベースの圧縮（導入時に有効化）。
// 注意: 本Workerは Squoosh の WASM/JS 資産が self に読み込まれている前提です。
// 未配置・未初期化の場合は例外を投げ、呼び出し側でフォールバックしてください。

export type SquooshTask = {
  id: string
  name: string
  type: string
  data: ArrayBuffer
  params: { target: 'jpeg'|'png'|'webp'|'avif'; quality?: number; effort?: number }
}

export type SquooshMsg =
  | { type: 'done'; id: string; name: string; data: ArrayBuffer; bytes: number; mime: string }
  | { type: 'error'; id: string; error: string }

declare const self: DedicatedWorkerGlobalScope & {
  // 期待するSquooshの初期化APIを利用側で提供する
  squooshEncode?: (input: ImageBitmap, opts: any) => Promise<{ data: ArrayBuffer; mime: string }>
}

self.onmessage = async (e: MessageEvent<SquooshTask>) => {
  const t = e.data
  try {
    const blob = new Blob([t.data], { type: t.type })
    const bitmap = await createImageBitmap(blob)
    if (!self.squooshEncode) {
      try {
        const dyn = (p: string) => (0, eval)('import(p)')
        const mod = await dyn('/wasm/squoosh/init.mjs')
        if (mod && typeof (mod as any).squooshEncode === 'function') {
          // @ts-ignore
          self.squooshEncode = (mod as any).squooshEncode
        }
      } catch (_) {
        // 後段で未初期化エラーへ
      }
    }
    if (!self.squooshEncode) throw new Error('Squoosh codecs are not initialized')
    const quality = t.params.quality ?? 0.9
    const effort = t.params.effort ?? 4
    const encoded = await self.squooshEncode(bitmap, { target: t.params.target, quality, effort })
    postMessage({ type: 'done', id: t.id, name: t.name, data: encoded.data, bytes: encoded.data.byteLength, mime: encoded.mime } as SquooshMsg, { transfer: [encoded.data] })
  } catch (err: any) {
    postMessage({ type: 'error', id: t.id, error: String(err?.message ?? err) } as SquooshMsg)
  }
}
