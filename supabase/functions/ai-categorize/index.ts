// Supabase Edge Function: ai-categorize
//
// Suggests a category and 3-6 tags for a link based on its title,
// description, and URL. Grounded against the user's existing categories and
// tags so it prefers reusing what they already have rather than inventing
// near-duplicates. Purely a suggestion — the frontend always requires an
// explicit accept before applying it; nothing here writes to the database.
//
// Deploy with: supabase functions deploy ai-categorize
// Requires: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { CORS_HEADERS, callClaudeForJson } from '../_shared/ai.ts'

interface RequestBody {
  url: string
  title?: string
  description?: string
  existingCategories: string[]
  existingTags: string[]
}

const SYSTEM_PROMPT = `You are a categorization assistant for a personal link-saving app called LinkVault.
Given a saved link's URL, title, and description, suggest ONE category and 3-6 short tags.

Rules:
- Strongly prefer reusing one of the user's existing categories if any reasonably fits. Only suggest a new category name if none of the existing ones fit at all.
- Strongly prefer reusing existing tags where relevant, but you may suggest new lowercase, single/two-word tags too.
- Tags should be lowercase, concise (1-2 words), and genuinely useful for search/filtering later — avoid generic filler tags.
- Respond with ONLY a raw JSON object, no markdown, no explanation, in exactly this shape:
{"category": "string", "tags": ["string", ...], "isNewCategory": boolean}`

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS })

  try {
    const body: RequestBody = await req.json()
    if (!body.url) {
      return new Response(JSON.stringify({ error: 'Missing "url".' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const userMessage = JSON.stringify({
      url: body.url,
      title: body.title ?? '',
      description: body.description ?? '',
      existingCategories: body.existingCategories ?? [],
      existingTags: (body.existingTags ?? []).slice(0, 60), // keep prompt small
    })

    const suggestion = await callClaudeForJson(SYSTEM_PROMPT, userMessage)

    return new Response(JSON.stringify(suggestion), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('ai-categorize error:', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'AI suggestion failed.' }),
      { status: 502, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }
})
