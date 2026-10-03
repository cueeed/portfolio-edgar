// @ts-nocheck — @sanity/ui / plugin refs conflict with React 19
import {OrderableDocumentList} from '@sanity/orderable-document-list'
import {forwardRef, useImperativeHandle, useMemo, useRef, useState} from 'react'
import {usePerspective} from 'sanity'
import {BulkDeleteProjects} from './BulkDeleteProjects'

type ListHandle = {
  actionHandlers: {
    showIncrements: () => void
    resetOrder: () => Promise<void>
  }
}

/**
 * Liste Projets (ordre drag & drop) + mode suppression cases à cocher.
 */
export const ProjectsListPane = forwardRef(function ProjectsListPane(props: any, ref) {
  const listRef = useRef<ListHandle | null>(null)
  const [mode, setMode] = useState<'order' | 'delete'>('order')
  const {perspectiveStack} = usePerspective()
  const currentVersion = Array.isArray(perspectiveStack) ? perspectiveStack[0] : 'drafts'

  const options = useMemo(
    () => ({
      ...props.options,
      currentVersion,
    }),
    [props.options, currentVersion],
  )

  useImperativeHandle(ref, () => ({
    actionHandlers: {
      showIncrements: () => listRef.current?.actionHandlers?.showIncrements?.(),
      resetOrder: () => listRef.current?.actionHandlers?.resetOrder?.(),
      bulkDelete: () => setMode('delete'),
      backToList: () => setMode('order'),
    },
  }))

  if (mode === 'delete') {
    return <BulkDeleteProjects onBack={() => setMode('order')} />
  }

  return <OrderableDocumentList key={String(currentVersion)} ref={listRef} options={options} />
})
