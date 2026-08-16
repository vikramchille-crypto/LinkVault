import { SimpleLinksPage } from '@/components/links/SimpleLinksPage'
import type { useLinks } from '@/hooks/useLinks'

type Props = ReturnType<typeof useLinks> & { search: string; openAddLink: () => void }

export function Archive(props: Props) {
  return (
    <SimpleLinksPage
      state={props}
      title="Archive"
      subtitle="Links you've tucked away but kept for reference."
      filter={(l) => l.is_archived && !l.is_deleted}
      emptyTitle="Archive is empty"
      emptyDescription="Archive a link from its menu to move it out of your main library without deleting it."
      alwaysIncludeArchived
    />
  )
}
