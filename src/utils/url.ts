// Normalizes a URL for equality comparisons (duplicate detection): lowercase
// host, strips a trailing slash, ignores the "www." prefix and any URL
// fragment. Deliberately does NOT ignore query strings, since those often
// point at meaningfully different content (e.g. YouTube ?v=... or search
// results pages).
export function normalizeUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl.trim())
    const host = url.hostname.replace(/^www\./, '').toLowerCase()
    const path = url.pathname.replace(/\/+$/, '')
    return `${host}${path}${url.search}`.toLowerCase()
  } catch {
    return rawUrl.trim().toLowerCase()
  }
}
