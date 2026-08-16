// Supabase Edge Function: link-preview
//
// Fetches a URL's title / description / thumbnail server-side, so:
//   1. No API key of any kind is needed (we parse the page's own Open
//      Graph tags), which means nothing to leak in the frontend bundle.
//   2. It avoids the browser CORS restrictions that block fetching most
//      sites' HTML directly from client-side JavaScript.
//
// Deploy with: supabase functions deploy link-preview
// (See README.md for the full one-time setup.)

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const FETCH_TIMEOUT_MS = 8000
const MAX_HTML_BYTES = 1_000_000 // 1MB is plenty for a <head> section

interface PreviewResult {
  title: string | null
  description: string | null
  image: string | null
}

function extractYouTubeId(url: URL): string | null {
  if (url.hostname.includes('youtu.be')) {
    return url.pathname.slice(1) || null
  }
  if (url.hostname.includes('youtube.com')) {
    if (url.pathname === '/watch') return url.searchParams.get('v')
    if (url.pathname.startsWith('/shorts/')) return url.pathname.split('/')[2] ?? null
    if (url.pathname.startsWith('/embed/')) return url.pathname.split('/')[2] ?? null
  }
  return null
}

async function fetchYouTubePreview(videoId: string): Promise<PreviewResult> {
  // YouTube's oEmbed endpoint is public and needs no key. The thumbnail URL
  // pattern (img.youtube.com/vi/<id>/...) is also public and stable.
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(
    `https://www.youtube.com/watch?v=${videoId}`
  )}&format=json`

  try {
    const res = await fetch(oembedUrl, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
    if (res.ok) {
      const data = await res.json()
      return {
        title: data.title ?? null,
        description: data.author_name ? `By ${data.author_name}` : null,
        image: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      }
    }
  } catch {
    // fall through to a thumbnail-only result below
  }

  return {
    title: null,
    description: null,
    image: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
  }
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
}

function extractMeta(html: string, property: string): string | null {
  // Matches both orderings: property before/after content, and both
  // property= and name= (some sites use name="description" etc).
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${property}["']`, 'i'),
  ]
  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match?.[1]) return decodeHtmlEntities(match[1].trim())
  }
  return null
}

function extractTitleTag(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i)
  return match?.[1] ? decodeHtmlEntities(match[1].trim()) : null
}

function resolveUrl(maybeRelative: string, base: URL): string {
  try {
    return new URL(maybeRelative, base).href
  } catch {
    return maybeRelative
  }
}

async function fetchGenericPreview(url: URL): Promise<PreviewResult> {
  const res = await fetch(url.href, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: {
      // A browser-like UA gets a much more complete HTML response from most
      // sites (including Facebook/Instagram's public share pages) than a
      // generic script UA would.
      'User-Agent':
        'Mozilla/5.0 (compatible; LinkVaultBot/1.0; +https://linkvault.app) AppleWebKit/537.36',
      Accept: 'text/html',
    },
    redirect: 'follow',
  })

  if (!res.ok || !res.body) {
    throw new Error(`Upstream returned ${res.status}`)
  }

  // Read only up to MAX_HTML_BYTES — we just need the <head>, not the whole page.
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let html = ''
  let bytesRead = 0

  while (bytesRead < MAX_HTML_BYTES) {
    const { done, value } = await reader.read()
    if (done) break
    bytesRead += value.byteLength
    html += decoder.decode(value, { stream: true })
    if (/<\/head>/i.test(html)) break
  }
  reader.cancel().catch(() => {})

  const title = extractMeta(html, 'og:title') ?? extractTitleTag(html)
  const description = extractMeta(html, 'og:description') ?? extractMeta(html, 'description')
  let image = extractMeta(html, 'og:image') ?? extractMeta(html, 'twitter:image')
  if (image) image = resolveUrl(image, url)

  return { title, description, image }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS })
  }

  try {
    const { url: rawUrl } = await req.json()
    if (!rawUrl || typeof rawUrl !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing "url" in request body.' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    let url: URL
    try {
      url = new URL(rawUrl)
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Invalid protocol')
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid URL.' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const youtubeId = extractYouTubeId(url)
    const preview = youtubeId ? await fetchYouTubePreview(youtubeId) : await fetchGenericPreview(url)

    return new Response(JSON.stringify(preview), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Preview fetch failed.' }),
      { status: 502, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }
})
