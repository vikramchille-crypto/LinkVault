// Small hand-rolled CSV parser/writer (RFC 4180-ish: handles quoted fields,
// commas and newlines inside quotes, escaped quotes as ""). No dependency
// needed for the fairly small/simple tabular data this app deals with.

export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const next = text[i + 1]

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"'
        i++
      } else if (char === '"') {
        inQuotes = false
      } else {
        field += char
      }
    } else if (char === '"') {
      inQuotes = true
    } else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && next === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else {
      field += char
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  const nonEmptyRows = rows.filter((r) => r.some((cell) => cell.trim() !== ''))
  if (nonEmptyRows.length === 0) return []

  const headers = nonEmptyRows[0].map((h) => h.trim())
  return nonEmptyRows.slice(1).map((r) => {
    const obj: Record<string, string> = {}
    headers.forEach((h, i) => (obj[h] = r[i] ?? ''))
    return obj
  })
}

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function toCsv(rows: Record<string, string>[], headers: string[]): string {
  const lines = [headers.map(csvEscape).join(',')]
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscape(row[h] ?? '')).join(','))
  }
  return lines.join('\r\n')
}

export interface ParsedBookmark {
  url: string
  title: string
  folder?: string
}

// Parses a standard Netscape "Bookmarks" HTML export (the format every
// major browser produces from File > Export Bookmarks). <H3> tags are
// folder names; <A HREF> tags are the actual bookmarks. Folder nesting is
// flattened — only the nearest enclosing folder name is kept as a category
// hint.
export function parseBookmarksHtml(html: string): ParsedBookmark[] {
  const results: ParsedBookmark[] = []
  const folderStack: string[] = []

  // Walk the file as a flat token stream of <H3>...</H3> and <A ...>...</A>
  // tags, in document order, using their relative nesting depth via </DL>
  // closings to pop folders off the stack.
  const tokenPattern = /<H3[^>]*>([^<]*)<\/H3>|<A\s+([^>]*)>([^<]*)<\/A>|<\/DL>/gi
  let match: RegExpExecArray | null

  while ((match = tokenPattern.exec(html))) {
    const [full, folderName, attrs, linkText] = match
    if (full.startsWith('</DL')) {
      folderStack.pop()
    } else if (folderName !== undefined) {
      folderStack.push(decodeHtml(folderName.trim()))
    } else if (attrs !== undefined) {
      const hrefMatch = attrs.match(/HREF="([^"]*)"/i)
      if (hrefMatch) {
        results.push({
          url: decodeHtml(hrefMatch[1]),
          title: decodeHtml(linkText.trim()) || hrefMatch[1],
          folder: folderStack[folderStack.length - 1],
        })
      }
    }
  }

  return results
}

function decodeHtml(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
}
