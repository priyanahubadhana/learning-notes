export class EPUB {
  constructor(loader: {
    entries: { filename: string }[]
    loadText: (name: string) => string | null
    loadBlob: (name: string, type?: string) => Blob | null
    getSize: (name: string) => number
    /** Our book guard (src/reader/epub/bookSandbox.ts, patch 3). */
    guard?: { allow: (detail: { isScript: boolean }) => boolean; data: (detail: { data: unknown; type: unknown }) => void }
  })
  init(): Promise<{ toc?: { label?: string; href?: string; subitems?: unknown[] | null }[] }>
}
