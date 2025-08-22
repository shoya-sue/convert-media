import JSZip from 'jszip'

export async function zipBlobs(files: { name: string; blob: Blob }[]) {
  const zip = new JSZip()
  for (const f of files) {
    zip.file(f.name, f.blob)
  }
  const content = await zip.generateAsync({ type: 'blob' })
  return content
}

