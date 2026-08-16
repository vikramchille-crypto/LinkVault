import { SimpleLinksPage } from '@/components/links/SimpleLinksPage'
import type { useLinks } from '@/hooks/useLinks'

type Props = ReturnType<typeof useLinks> & { search: string; openAddLink: () => void }

export function Trash(props: Props) {
  return (
    <SimpleLinksPage
      state={props}
      title="Trash"
      subtitle="Deleted links. Restore them or remove them for good."
      filter={(l) => l.is_deleted}
      emptyTitle="Trash is empty"
      emptyDescription="Links you delete will appear here until you remove them permanently."
      showCategoryFilter={false}
      alwaysIncludeArchived
    />
  )
}
