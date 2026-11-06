export class EPUB {
  constructor(loader: {
    entries: { filename: string }[]
    loadText: (name: string) => string | null
    loadBlob: (name: string, type?: string) => Blob | null
    getSize: (name: string) => number
  })
  init(): Promise<{ toc?: { label?: string; href?: string; subitems?: unknown[] | null }[] }>
}
