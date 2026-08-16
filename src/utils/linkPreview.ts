import { supabase } from '@/lib/supabase'

export interface LinkPreview {
  title: string | null
  description: string | null
  image: string | null
}

// Calls the `link-preview` Supabase Edge Function, which fetches the page
// server-side and parses its Open Graph tags (or YouTube's oEmbed data for
// YouTube links). Running this server-side means no third-party API key
// ever needs to live in the frontend bundle, and it sidesteps the browser
// CORS restrictions that block fetching most sites' HTML directly from
// client-side JavaScript. See supabase/functions/link-preview and the
// README for one-time deployment steps.
export async function fetchLinkPreview(url: string): Promise<LinkPreview | null> {
  const { data, error } = await supabase.functions.invoke('link-preview', {
    body: { url },
  })

  if (error) {
    throw new Error(
      "Couldn't fetch a preview for this link. Make sure the link-preview Edge Function is deployed — see the README."
    )
  }
  if (data?.error) {
    throw new Error(data.error)
  }

  return {
    title: data?.title ?? null,
    description: data?.description ?? null,
    image: data?.image ?? null,
  }
}

