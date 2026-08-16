// Turns a user-typed label like "AI & Tech" into a stable key like "ai_tech".
// The key is generated once at creation time and never changes afterwards,
// even if the label is later renamed — this keeps links pointing at a
// category stable across renames.
export function slugify(label: string): string {
  const base = label
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

  return base || 'category'
}

// Appends -2, -3, ... if the slug already exists in `existingKeys`.
export function uniqueSlug(label: string, existingKeys: string[]): string {
  const base = slugify(label)
  if (!existingKeys.includes(base)) return base

  let n = 2
  while (existingKeys.includes(`${base}_${n}`)) n += 1
  return `${base}_${n}`
}
