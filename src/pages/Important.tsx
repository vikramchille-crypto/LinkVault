import { SimpleLinksPage } from '@/components/links/SimpleLinksPage'
import type { useLinks } from '@/hooks/useLinks'

type Props = ReturnType<typeof useLinks> & { search: string; openAddLink: () => void }

export function Important(props: Props) {
  return (
    <SimpleLinksPage
      state={props}
      title="Important"
      subtitle="Links you've flagged as important."
      filter={(l) => l.is_important && !l.is_deleted}
      emptyTitle="Nothing marked important"
      emptyDescription="Flag a link as important from its menu to keep it top of mind here."
    />
  )
}
