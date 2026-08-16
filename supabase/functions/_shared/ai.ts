// Shared helpers used by ai-categorize and nl-search.

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-haiku-4-5-20251001'

// Calls Claude with a system prompt + user message, expecting a single JSON
// object back. The API key lives only in Supabase's server-side secrets
// (`supabase secrets set ANTHROPIC_API_KEY=...`) — it is never sent to or
// readable from the frontend.
export async function callClaudeForJson(system: string, userMessage: string): Promise<unknown> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured on the server.')
  }

  const res = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 512,
      system,
      messages: [{ role: 'user', content: userMessage }],
    }),
    signal: AbortSignal.timeout(15000),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Claude API error (${res.status}): ${text.slice(0, 200)}`)
  }

  const data = await res.json()
  const textBlock = data.content?.find((b: { type: string }) => b.type === 'text')
  if (!textBlock?.text) throw new Error('No text response from Claude.')

  // Claude is asked to return raw JSON, but strip markdown fences defensively
  // in case it wraps the answer in ```json ... ```.
  const cleaned = textBlock.text.replace(/^```json\s*|```$/g, '').trim()
  return JSON.parse(cleaned)
}
