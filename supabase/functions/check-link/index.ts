// Supabase Edge Function: check-link
//
// Checks whether a saved URL still resolves, server-side (a browser can't
// reliably do this itself — most sites block cross-origin HEAD/GET requests
// via CORS). Only ever runs when the user explicitly triggers it (one link
// or a batch "Check Links" pass) — never on a background timer, per the
// brief's caution against scanning URLs without user control.
//
// Deploy with: supabase functions deploy check-link

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const TIMEOUT_MS = 7000

async function probe(url: string, method: 'HEAD' | 'GET'): Promise<Response> {
  return fetch(url, {
    method,
    redirect: 'follow',
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; LinkVaultHealthCheck/1.0)',
    },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS })

  try {
    const { url: rawUrl } = await req.json()
    if (!rawUrl || typeof rawUrl !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing "url".' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    let url: URL
    try {
      url = new URL(rawUrl)
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error('bad protocol')
    } catch {
      return new Response(JSON.stringify({ status: 'broken', reason: 'Invalid URL' }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    let res: Response
    try {
      res = await probe(url.href, 'HEAD')
      // Some servers don't support HEAD properly (405/501) — retry with GET.
      if (res.status === 405 || res.status === 501) {
        res = await probe(url.href, 'GET')
      }
    } catch {
      // Network error, timeout, DNS failure, etc.
      return new Response(JSON.stringify({ status: 'broken', reason: 'Unreachable' }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const status = res.ok || (res.status >= 300 && res.status < 400) ? 'active' : 'broken'
    return new Response(JSON.stringify({ status, code: res.status }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Link check failed.' }),
      { status: 502, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }
})
