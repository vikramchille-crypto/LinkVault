import { supabase } from '@/lib/supabase'

export interface CategorySuggestion {
  category: string
  tags: string[]
  isNewCategory?: boolean
}

// Calls the `ai-categorize` Edge Function to suggest a category and tags.
// Entirely optional — the caller decides whether to show/apply the result,
// and saving a link never depends on this succeeding.
export async function suggestCategorization(input: {
  url: string
  title?: string
  description?: string
  existingCategories: string[]
  existingTags: string[]
}): Promise<CategorySuggestion> {
  const { data, error } = await supabase.functions.invoke('ai-categorize', { body: input })

  if (error) throw new Error("Couldn't get an AI suggestion right now. Make sure the ai-categorize Edge Function is deployed.")
  if (data?.error) throw new Error(data.error)

  return {
    category: data.category,
    tags: Array.isArray(data.tags) ? data.tags.slice(0, 6) : [],
    isNewCategory: Boolean(data.isNewCategory),
  }
}
