import { strToU8, zipSync } from 'fflate'
import { runsText, type ExportNode, type ExportPage, type Run } from './model'

/**
 * A Word file (.docx) written by hand: a zip of a few XML parts. Headings,
 * rich text, lists, to-do boxes, quotes, code, tables, pictures and ink
 * pictures. Pure code (no DOM), so it is unit-tested by unzipping it.
 */

/** A picture ready for Word (Word reads png, jpeg and gif only). */
export interface DocxImage {
  data: Uint8Array
  ext: 'png' | 'jpeg' | 'gif'
  /** Pixel size. */
  w: number
  h: number
}

const esc = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    // Characters XML 1.0 cannot hold.
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')

const EMU_PER_PX = 9525
/** Widest picture on a page (6.5 inch text width). */
const MAX_EMU = 6.5 * 914400

const rPr = (r: Run, extra = ''): string => {
  const p: string[] = []
  if (r.code)
    p.push('<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:cs="Consolas"/>')
  if (r.bold) p.push('<w:b/>')
  if (r.italic) p.push('<w:i/>')
  if (r.strike) p.push('<w:strike/>')
  if (r.color) p.push(`<w:color w:val="${r.color.slice(1)}"/>`)
  // Word wants the parts in this order: u before shd.
  if (r.underline || r.href) p.push('<w:u w:val="single"/>')
  if (r.bg)
    p.push(`<w:shd w:val="clear" w:color="auto" w:fill="${r.bg.slice(1)}"/>`)
  return p.length + extra.length ? `<w:rPr>${extra}${p.join('')}</w:rPr>` : ''
}

class Writer {
  rels: string[] = []
  media: Record<string, Uint8Array> = {}
  nums: number[] = []
  private nextRel = 10
  private nextPic = 1
  private nextNum = 3

  link(href: string): string {
    const id = `rId${this.nextRel++}`
    this.rels.push(
      `<Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="${esc(href)}" TargetMode="External"/>`,
    )
    return id
  }

  /** A new numbered list that starts at 1. */
  newList(): number {
    const n = this.nextNum++
    this.nums.push(n)
    return n
  }

  runs(runs: readonly Run[], extra = ''): string {
    return runs
      .map((r) => {
        const parts = r.text.split('\n')
        const inner = parts
          .map(
            (line, i) =>
              (i > 0 ? '<w:br/>' : '') +
              `<w:t xml:space="preserve">${esc(line)}</w:t>`,
          )
          .join('')
        const run = `<w:r>${rPr(r, extra)}${inner}</w:r>`
        if (!r.href || !/^(https?:|mailto:)/i.test(r.href)) return run
        return `<w:hyperlink r:id="${this.link(r.href)}">${run}</w:hyperlink>`
      })
      .join('')
  }

  picture(img: DocxImage): string {
    const n = this.nextPic++
    const file = `image${n}.${img.ext}`
    this.media[`word/media/${file}`] = img.data
    const rid = `rId${this.nextRel++}`
    this.rels.push(
      `<Relationship Id="${rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${file}"/>`,
    )
    let cx = Math.max(1, img.w) * EMU_PER_PX
    let cy = Math.max(1, img.h) * EMU_PER_PX
    if (cx > MAX_EMU) {
      cy = Math.round((cy * MAX_EMU) / cx)
      cx = Math.round(MAX_EMU)
    }
    return (
      `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0">` +
      `<wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${n}" name="Picture ${n}"/>` +
      `<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">` +
      `<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
      `<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
      `<pic:nvPicPr><pic:cNvPr id="${n}" name="${file}"/><pic:cNvPicPr/></pic:nvPicPr>` +
      `<pic:blipFill><a:blip r:embed="${rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>` +
      `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>` +
      `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic>` +
      `</a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`
    )
  }
}

const para = (ppr: string, body: string): string =>
  `<w:p>${ppr ? `<w:pPr>${ppr}</w:pPr>` : ''}${body}</w:p>`

function body(
  w: Writer,
  nodes: readonly ExportNode[],
  depth: number,
  images: ReadonlyMap<string, DocxImage>,
  out: string[],
  headingBase: number,
): void {
  let list = 0
  for (const n of nodes) {
    if (n.kind !== 'number') list = 0
    const ind = depth > 0 ? `<w:ind w:left="${depth * 360}"/>` : ''
    switch (n.kind) {
      case 'heading':
        out.push(
          para(
            `<w:pStyle w:val="Heading${Math.min(6, headingBase + (n.level ?? 1))}"/>`,
            w.runs(n.runs),
          ),
        )
        break
      case 'bullet':
      case 'toggle':
        out.push(
          para(
            `<w:numPr><w:ilvl w:val="${Math.min(8, depth)}"/><w:numId w:val="1"/></w:numPr>`,
            w.runs(n.runs),
          ),
        )
        break
      case 'number':
        if (!list) list = w.newList()
        out.push(
          para(
            `<w:numPr><w:ilvl w:val="${Math.min(8, depth)}"/><w:numId w:val="${list}"/></w:numPr>`,
            w.runs(n.runs),
          ),
        )
        break
      case 'todo':
        out.push(
          para(
            ind,
            w.runs([{ text: n.checked ? '☑ ' : '☐ ' }]) + w.runs(n.runs),
          ),
        )
        break
      case 'quote':
        out.push(
          para(
            `<w:pStyle w:val="Quote"/>${ind}`,
            w.runs(n.runs.map((r) => ({ ...r, italic: true }))),
          ),
        )
        break
      case 'callout':
        out.push(
          para(
            `<w:shd w:val="clear" w:color="auto" w:fill="F5F5F7"/>${ind}`,
            w.runs([{ text: '💡 ' }, ...n.runs]),
          ),
        )
        break
      case 'card':
        out.push(
          para(
            ind,
            w.runs([
              { text: 'Q: ', bold: true },
              ...n.runs.map((r) => ({ ...r, bold: true })),
            ]),
          ),
        )
        break
      case 'code':
        out.push(
          para(
            '<w:pStyle w:val="Code"/>',
            w.runs([{ text: runsText(n.runs), code: true }]),
          ),
        )
        break
      case 'divider':
        out.push(
          para(
            '<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="C7C7CC"/></w:pBdr>',
            '',
          ),
        )
        break
      case 'image': {
        const img = n.imageId ? images.get(n.imageId) : undefined
        if (img) out.push(para('', w.picture(img)))
        else if (n.imageUrl)
          out.push(para('', w.runs([{ text: n.imageUrl, href: n.imageUrl }])))
        if (n.caption)
          out.push(
            para(
              '',
              w.runs([{ text: n.caption, italic: true, color: '#6e6e73' }]),
            ),
          )
        break
      }
      case 'table': {
        const rows = n.rows ?? []
        if (rows.length === 0) break
        const cols = Math.max(...rows.map((r) => r.length))
        const border = (side: string) =>
          `<w:${side} w:val="single" w:sz="4" w:space="0" w:color="C7C7CC"/>`
        out.push(
          `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblBorders>${['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(border).join('')}</w:tblBorders></w:tblPr>` +
            `<w:tblGrid>${'<w:gridCol w:w="2000"/>'.repeat(cols)}</w:tblGrid>` +
            rows
              .map(
                (r) =>
                  `<w:tr>${Array.from({ length: cols }, (_, i) => `<w:tc><w:tcPr><w:tcW w:w="2000" w:type="dxa"/></w:tcPr>${para('', w.runs(r[i] ?? []))}</w:tc>`).join('')}</w:tr>`,
              )
              .join('') +
            `</w:tbl>`,
          para('', ''),
        )
        break
      }
      case 'plain':
        for (const line of runsText(n.runs).split('\n')) {
          const lead = /^ */.exec(line)![0].length
          out.push(
            para(
              `<w:ind w:left="${(lead / 2) * 360}"/>`,
              w.runs([{ text: line.trim() }]),
            ),
          )
        }
        break
      default:
        out.push(para(ind, w.runs(n.runs)))
    }
    const listLike = ['bullet', 'number', 'toggle'].includes(n.kind)
    body(
      w,
      n.children,
      listLike || n.kind === 'todo' || n.kind === 'card' ? depth + 1 : depth,
      images,
      out,
      headingBase,
    )
  }
}

function pageXml(
  w: Writer,
  page: ExportPage,
  level: number,
  images: ReadonlyMap<string, DocxImage>,
  out: string[],
  inkImage: (p: ExportPage) => DocxImage | undefined,
): void {
  out.push(
    para(
      `<w:pStyle w:val="Heading${Math.min(6, level)}"/>`,
      w.runs([{ text: page.title || 'Untitled' }]),
    ),
  )
  body(w, page.nodes, 0, images, out, level)
  const ink = inkImage(page)
  if (ink) out.push(para('', w.picture(ink)))
  for (const child of page.children)
    pageXml(w, child, level + 1, images, out, inkImage)
}

const NS =
  'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ' +
  'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
  'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"'

const heading = (n: number, size: number): string =>
  `<w:style w:type="paragraph" w:styleId="Heading${n}"><w:name w:val="heading ${n}"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="240" w:after="80"/><w:outlineLvl w:val="${n - 1}"/></w:pPr><w:rPr><w:b/><w:sz w:val="${size}"/></w:rPr></w:style>`

const STYLES =
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">` +
  `<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Mangal" w:eastAsia="Calibri"/><w:sz w:val="22"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>` +
  `<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>` +
  [1, 2, 3, 4, 5, 6]
    .map((n) => heading(n, [40, 32, 28, 26, 24, 22][n - 1]))
    .join('') +
  `<w:style w:type="paragraph" w:styleId="Quote"><w:name w:val="Quote"/><w:basedOn w:val="Normal"/><w:pPr><w:pBdr><w:left w:val="single" w:sz="18" w:space="8" w:color="C7C7CC"/></w:pBdr><w:ind w:left="360"/></w:pPr></w:style>` +
  `<w:style w:type="paragraph" w:styleId="Code"><w:name w:val="Code"/><w:basedOn w:val="Normal"/><w:pPr><w:shd w:val="clear" w:color="auto" w:fill="F5F5F7"/><w:spacing w:after="0"/></w:pPr><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:sz w:val="20"/></w:rPr></w:style>` +
  `</w:styles>`

function numbering(lists: readonly number[]): string {
  const lvls = (fmt: string, text: (i: number) => string) =>
    Array.from(
      { length: 9 },
      (_, i) =>
        `<w:lvl w:ilvl="${i}"><w:start w:val="1"/><w:numFmt w:val="${fmt}"/><w:lvlText w:val="${text(i)}"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="${720 + i * 360}" w:hanging="360"/></w:pPr></w:lvl>`,
    ).join('')
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">` +
    `<w:abstractNum w:abstractNumId="1"><w:multiLevelType w:val="hybridMultilevel"/>${lvls('bullet', (i) => (i % 2 ? '–' : '•'))}</w:abstractNum>` +
    `<w:abstractNum w:abstractNumId="2"><w:multiLevelType w:val="hybridMultilevel"/>${lvls('decimal', (i) => `%${i + 1}.`)}</w:abstractNum>` +
    `<w:num w:numId="1"><w:abstractNumId w:val="1"/></w:num>` +
    lists
      .map(
        (n) =>
          `<w:num w:numId="${n}"><w:abstractNumId w:val="2"/><w:lvlOverride w:ilvl="0"><w:startOverride w:val="1"/></w:lvlOverride></w:num>`,
      )
      .join('') +
    `</w:numbering>`
  )
}

export interface DocxInput {
  /** Pages in order; each page's sub-pages follow under deeper headings. */
  pages: ExportPage[]
  images: ReadonlyMap<string, DocxImage>
  /** The picture of a page's ink, if it has one. */
  ink?: ReadonlyMap<ExportPage, DocxImage>
  /** Document title for the file properties. */
  title?: string
}

/** The .docx file's bytes. */
export function buildDocx(input: DocxInput): Uint8Array {
  const w = new Writer()
  const out: string[] = []
  const inkImage = (p: ExportPage) => input.ink?.get(p)
  input.pages.forEach((page, i) => {
    if (i > 0) out.push('<w:p><w:r><w:br w:type="page"/></w:r></w:p>')
    pageXml(w, page, 1, input.images, out, inkImage)
  })
  const documentXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${NS}><w:body>${out.join('')}` +
    `<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>`
  const rels =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
    `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>` +
    w.rels.join('') +
    `</Relationships>`
  const types =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
    `<Default Extension="xml" ContentType="application/xml"/>` +
    `<Default Extension="png" ContentType="image/png"/><Default Extension="jpeg" ContentType="image/jpeg"/><Default Extension="gif" ContentType="image/gif"/>` +
    `<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>` +
    `<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>` +
    `<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>` +
    `<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>` +
    `</Types>`
  const root =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>` +
    `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>` +
    `</Relationships>`
  const core = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${esc(input.title ?? '')}</dc:title><dc:creator>Learning Notes</dc:creator></cp:coreProperties>`
  return zipSync({
    '[Content_Types].xml': strToU8(types),
    '_rels/.rels': strToU8(root),
    'docProps/core.xml': strToU8(core),
    'word/document.xml': strToU8(documentXml),
    'word/styles.xml': strToU8(STYLES),
    'word/numbering.xml': strToU8(numbering(w.nums)),
    'word/_rels/document.xml.rels': strToU8(rels),
    ...w.media,
  })
}
