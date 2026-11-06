/**
 * pdf.js, loaded only when a PDF is imported or read (never in the first load).
 * The worker is a file of our own site (allowed by the `worker-src 'self'`
 * rule), so no code is fetched from elsewhere.
 */
type PdfJs = typeof import('pdfjs-dist')

let loading: Promise<PdfJs> | undefined

export function loadPdfjs(): Promise<PdfJs> {
  loading ??= (async () => {
    const [lib, worker] = await Promise.all([
      import('pdfjs-dist'),
      import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
    ])
    lib.GlobalWorkerOptions.workerSrc = worker.default
    return lib
  })()
  return loading
}
