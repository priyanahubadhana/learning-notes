import { strToU8, zipSync } from 'fflate'

/**
 * Tiny book files made on the fly for the end-to-end tests (no binary files
 * in the repository): a text PDF, an EPUB and a DOCX.
 */

/** A PDF with one line of text per page, Helvetica, 612 x 792. */
export function makePdf(
  lines: string[],
  opts: { title?: string } = {},
): Buffer {
  const objs: string[] = []
  const n = lines.length
  // 1 catalog, 2 pages, 3 font, then (page, content) pairs.
  objs[1] = '<< /Type /Catalog /Pages 2 0 R' + ' >>'
  const kids = lines.map((_, i) => `${4 + i * 2} 0 R`).join(' ')
  objs[2] = `<< /Type /Pages /Kids [${kids}] /Count ${n} >>`
  objs[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
  lines.forEach((line, i) => {
    const content = `BT /F1 24 Tf 72 700 Td (${line.replace(/[()\\]/g, '')}) Tj ET`
    objs[4 + i * 2] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${5 + i * 2} 0 R /Resources << /Font << /F1 3 0 R >> >> >>`
    objs[5 + i * 2] =
      `<< /Length ${content.length} >>\nstream\n${content}\nendstream`
  })
  if (opts.title) {
    objs[4 + n * 2] = `<< /Title (${opts.title}) /Author (Test Author) >>`
  }
  let out = '%PDF-1.4\n'
  const offsets: number[] = []
  for (let i = 1; i < objs.length; i++) {
    offsets[i] = out.length
    out += `${i} 0 obj\n${objs[i]}\nendobj\n`
  }
  const xref = out.length
  out += `xref\n0 ${objs.length}\n0000000000 65535 f \n`
  for (let i = 1; i < objs.length; i++) {
    out += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`
  }
  out += `trailer\n<< /Size ${objs.length} /Root 1 0 R${
    opts.title ? ` /Info ${4 + n * 2} 0 R` : ''
  } >>\nstartxref\n${xref}\n%%EOF\n`
  return Buffer.from(out, 'latin1')
}

/** A two-chapter EPUB. */
export function makeEpub(title = 'Test Epub'): Buffer {
  const chapter = (n: number, text: string) =>
    `<?xml version="1.0" encoding="UTF-8"?><html xmlns="http://www.w3.org/1999/xhtml"><head><title>Chapter ${n}</title></head><body><h1>Chapter ${n}</h1><p>${text}</p></body></html>`
  return Buffer.from(
    zipSync({
      mimetype: [strToU8('application/epub+zip'), { level: 0 }],
      'META-INF/container.xml': strToU8(
        '<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>',
      ),
      'OEBPS/content.opf': strToU8(
        `<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="id">test-epub</dc:identifier><dc:title>${title}</dc:title><dc:creator>Epub Author</dc:creator><dc:language>en</dc:language></metadata><manifest><item id="c1" href="c1.xhtml" media-type="application/xhtml+xml"/><item id="c2" href="c2.xhtml" media-type="application/xhtml+xml"/><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/></manifest><spine><itemref idref="c1"/><itemref idref="c2"/></spine></package>`,
      ),
      'OEBPS/nav.xhtml': strToU8(
        '<?xml version="1.0"?><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>Nav</title></head><body><nav epub:type="toc"><ol><li><a href="c1.xhtml">Chapter 1</a></li><li><a href="c2.xhtml">Chapter 2</a></li></ol></nav></body></html>',
      ),
      'OEBPS/c1.xhtml': strToU8(
        chapter(1, 'The quick brown fox jumps over the lazy dog.'),
      ),
      'OEBPS/c2.xhtml': strToU8(chapter(2, 'Second chapter text lives here.')),
    }),
  )
}

/** A DOCX with an intro and two Heading 1 chapters. */
export function makeDocx(): Buffer {
  const p = (text: string, style?: string) =>
    `<w:p>${style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : ''}<w:r><w:t>${text}</w:t></w:r></w:p>`
  return Buffer.from(
    zipSync({
      '[Content_Types].xml': strToU8(
        '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
      ),
      '_rels/.rels': strToU8(
        '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
      ),
      'word/document.xml': strToU8(
        `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${p('Opening words')}${p('Alpha chapter', 'Heading1')}${p('Alpha body text')}${p('Beta chapter', 'Heading1')}${p('Beta body text')}</w:body></w:document>`,
      ),
    }),
  )
}

/**
 * A hostile EPUB (EPUB guard 3): every way a book page could try to run code
 * and reach the app. Each attempt would set `parent.__bookRan` (or the
 * frame's own `__bookRan`) and add a "ran" mark to the app's title.
 */
export function makeHostileEpub(): Buffer {
  const hit = (tag: string) =>
    `try{(window.top||window).__bookRan=(window.top.__bookRan||[]).concat('${tag}');window.__bookRan=1;top.document.title+=' ran:${tag}'}catch(e){window.__bookRan=1}`
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
  const page = `<?xml version="1.0" encoding="UTF-8"?><html xmlns="http://www.w3.org/1999/xhtml" xmlns:xlink="http://www.w3.org/1999/xlink"><head><title>Bad</title><script>${hit('inline')}</script><script src="evil.js"></script><script src="/sw.js"></script><meta http-equiv="refresh" content="0;url=javascript:${esc(hit('refresh'))}"/></head><body onload="${esc(hit('onload'))}"><p onmouseover="${esc(hit('mouseover'))}" onclick="${esc(hit('onclick'))}">The quick brown fox jumps over the lazy dog.</p><p><a id="jslink" href="javascript:${esc(hit('jslink'))}">Bad link</a></p><img id="spy" src="https://tracker.example/pixel.png?opened=1"/><p style="background:url(https://tracker.example/bg.png)">Spy</p><img src="missing.png" onerror="${esc(hit('onerror'))}"/><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" onload="${esc(hit('svgload'))}"><script>${hit('svgscript')}</script></svg><iframe srcdoc="&lt;script&gt;parent.parent.__bookRan=['srcdoc']&lt;/script&gt;"></iframe><object data="evil.js" type="text/html"></object></body></html>`
  return Buffer.from(
    zipSync({
      mimetype: [strToU8('application/epub+zip'), { level: 0 }],
      'META-INF/container.xml': strToU8(
        '<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>',
      ),
      'OEBPS/content.opf': strToU8(
        `<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="id">hostile-epub</dc:identifier><dc:title>Hostile</dc:title><dc:language>en</dc:language></metadata><manifest><item id="c1" href="c1.xhtml" media-type="application/xhtml+xml" properties="scripted svg"/><item id="evil" href="evil.js" media-type="application/javascript"/><item id="c2" href="c2.html" media-type="text/html"/><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/></manifest><spine><itemref idref="c1"/><itemref idref="c2"/></spine></package>`,
      ),
      'OEBPS/nav.xhtml': strToU8(
        '<?xml version="1.0"?><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>Nav</title></head><body><nav epub:type="toc"><ol><li><a href="c1.xhtml">One</a></li><li><a href="c2.html">Two</a></li></ol></nav></body></html>',
      ),
      'OEBPS/c1.xhtml': strToU8(page),
      'OEBPS/evil.js': strToU8(hit('external')),
      'OEBPS/c2.html': strToU8(
        `<html><head><script>${hit('html-inline')}</script></head><body onload="${esc(hit('html-onload'))}"><p>Second page.</p></body></html>`,
      ),
    }),
  )
}

/** An EPUB whose first chapter has a picture of its own and one from outside. */
export function makePictureEpub(title = 'Picture Book'): Buffer {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="160" viewBox="0 0 320 160"><rect width="320" height="160" fill="#7aa6d8"/><circle cx="90" cy="80" r="46" fill="#f2c94c"/><rect x="170" y="50" width="110" height="60" rx="10" fill="#3d6b4f"/></svg>'
  const c1 =
    '<?xml version="1.0" encoding="UTF-8"?><html xmlns="http://www.w3.org/1999/xhtml"><head><title>Chapter 1</title></head><body><h1>Chapter 1</h1><p>The quick brown fox jumps over the lazy dog.</p><p><img src="pic.svg" alt="A sun and a hill" width="320" height="160"/></p><p>A picture from another website follows and stays hidden.</p><p><img src="https://tracker.example/pixel.png" alt="Outside picture" width="120" height="60"/></p></body></html>'
  return Buffer.from(
    zipSync({
      mimetype: [strToU8('application/epub+zip'), { level: 0 }],
      'META-INF/container.xml': strToU8(
        '<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>',
      ),
      'OEBPS/content.opf': strToU8(
        `<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="id">picture-epub</dc:identifier><dc:title>${title}</dc:title><dc:language>en</dc:language></metadata><manifest><item id="c1" href="c1.xhtml" media-type="application/xhtml+xml"/><item id="pic" href="pic.svg" media-type="image/svg+xml"/><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/></manifest><spine><itemref idref="c1"/></spine></package>`,
      ),
      'OEBPS/nav.xhtml': strToU8(
        '<?xml version="1.0"?><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>Nav</title></head><body><nav epub:type="toc"><ol><li><a href="c1.xhtml">Chapter 1</a></li></ol></nav></body></html>',
      ),
      'OEBPS/c1.xhtml': strToU8(c1),
      'OEBPS/pic.svg': strToU8(svg),
    }),
  )
}
