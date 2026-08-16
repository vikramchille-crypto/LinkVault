// Supabase Edge Function: nl-search
//
// Translates a natural-language query ("show my business ideas", "YouTube
// videos about terrarium lighting") into structured filters the frontend
// already knows how to apply — it does NOT replace or bypass normal keyword
// search, which always stays available regardless of this function's
// availability or accuracy.
//
// Deploy with: supabase functions deploy nl-search
// Requires: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { CORS_HEADERS, callClaudeForJson } from '../_shared/ai.ts'

interface RequestBody {
  query: string
  categories: string[]
  sources: string[]
  tags: string[]
}

const SYSTEM_PROMPT = `You translate a natural-language search query into structured filters for a personal link library app.

You are given the user's ACTUAL category names, source names, and tags — only ever use values from those exact lists for the category/source/tags fields. Never invent a category, source, or tag that isn't in the provided list. If nothing in the lists matches, omit that field.

Respond with ONLY a raw JSON object, no markdown, no explanation, in exactly this shape (all fields optional, omit ones that don't apply):
{
  "keywords": "string of remaining free-text search terms, or omit",
  "category": "exact category name from the list, or omit",
  "source": "exact source name from the list, or omit",
  "tags": ["exact tag(s) from the list", ...],
  "favoriteOnly": boolean,
  "importantOnly": boolean,
  "recentDays": number (e.g. 7 for 'recently', 30 for 'this month', omit if not time-related)
}

Examples:
"Show my business ideas" with categories including "Business" -> {"category": "Business"}
"Find YouTube videos about terrarium lighting" with sources including "YouTube" -> {"source": "YouTube", "keywords": "terrarium lighting"}
"Show health links I saved recently" with categories including "Health" -> {"category": "Health", "recentDays": 14}
"Show my favorite marketing links" with tags including "marketing" -> {"favoriteOnly": true, "tags": ["marketing"]}
"Find everything related to Claude" (no matching category/tag) -> {"keywords": "Claude"}`

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS })

  try {
    const body: RequestBody = await req.json()
    if (!body.query?.trim()) {
      return new Response(JSON.stringify({ error: 'Missing "query".' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const userMessage = JSON.stringify({
      query: body.query,
      categories: body.categories ?? [],
      sources: body.sources ?? [],
      tags: (body.tags ?? []).slice(0, 80),
    })

    const filters = await callClaudeForJson(SYSTEM_PROMPT, userMessage)

    return new Response(JSON.stringify(filters), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('nl-search error:', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Search translation failed.' }),
      { status: 502, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }
})
