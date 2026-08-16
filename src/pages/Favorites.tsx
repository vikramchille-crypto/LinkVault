import { SimpleLinksPage } from '@/components/links/SimpleLinksPage'
import type { useLinks } from '@/hooks/useLinks'

type Props = ReturnType<typeof useLinks> & { search: string; openAddLink: () => void }

export function Favorites(props: Props) {
  return (
    <SimpleLinksPage
      state={props}
      title="Favorites"
      subtitle="Links you've starred for quick access."
      filter={(l) => l.is_favorite && !l.is_deleted}
      emptyTitle="No favorites yet"
      emptyDescription="Star a link from any card to pin it here for quick access."
    />
  )
}
