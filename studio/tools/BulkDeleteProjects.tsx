// @ts-nocheck — @sanity/ui v4 typings conflict with React 19
import {useCallback, useEffect, useState} from 'react'
import {useClient} from 'sanity'
import {Box, Button, Card, Checkbox, Flex, Spinner, Stack, Text} from '@sanity/ui'

type ProjectRow = {
  _id: string
  title?: string
}

type Notice = {tone: 'positive' | 'critical' | 'caution'; text: string} | null

type Props = {
  onBack?: () => void
}

export function BulkDeleteProjects({onBack}: Props) {
  const client = useClient({apiVersion: '2026-03-01'})
  const [projects, setProjects] = useState<ProjectRow[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [notice, setNotice] = useState<Notice>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setNotice(null)
    try {
      const rows = await client.fetch<ProjectRow[]>(
        `*[_type == "project" && !(_id in path("drafts.**"))] | order(coalesce(orderRank, "~"), title asc) { _id, title }`,
      )
      setProjects(rows)
      setSelected(new Set())
    } catch (error) {
      setNotice({
        tone: 'critical',
        text: error instanceof Error ? error.message : String(error),
      })
    } finally {
      setLoading(false)
    }
  }, [client])

  useEffect(() => {
    void load()
  }, [load])

  const selectedCount = selected.size
  const allSelected = projects.length > 0 && selectedCount === projects.length

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (allSelected) setSelected(new Set())
    else setSelected(new Set(projects.map((project) => project._id)))
  }

  const deleteSelected = async () => {
    if (selectedCount === 0) return

    const confirmed = window.confirm(
      `Supprimer ${selectedCount} projet${selectedCount > 1 ? 's' : ''} ?\n\nCette action est irréversible (brouillons et versions publiées).`,
    )
    if (!confirmed) return

    setDeleting(true)
    setNotice(null)
    try {
      const idsToDelete = new Set<string>()
      for (const id of selected) {
        const publishedId = id.replace(/^drafts\./, '')
        idsToDelete.add(publishedId)
        idsToDelete.add(`drafts.${publishedId}`)
      }

      const tx = client.transaction()
      for (const id of idsToDelete) {
        tx.delete(id)
      }
      await tx.commit({visibility: 'async'})

      setNotice({
        tone: 'positive',
        text: `${selectedCount} projet${selectedCount > 1 ? 's' : ''} supprimé${selectedCount > 1 ? 's' : ''}. Pense à « Mettre en ligne ».`,
      })
      await load()
    } catch (error) {
      setNotice({
        tone: 'critical',
        text: error instanceof Error ? error.message : String(error),
      })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Card height="fill" padding={4} sizing="border" overflow="auto">
      <Stack space={4}>
        <Flex align="flex-start" justify="space-between" gap={3} wrap="wrap">
          <Stack space={2} style={{flex: 1, minWidth: 16 * 12}}>
            <Text size={3} weight="semibold">
              Supprimer des projets
            </Text>
            <Text muted size={1}>
              Coche les projets à retirer, confirme, puis utilise « Mettre en ligne » pour
              actualiser le site.
            </Text>
          </Stack>
          {onBack && (
            <Button text="Retour à la liste" mode="ghost" onClick={onBack} disabled={deleting} />
          )}
        </Flex>

        {notice && (
          <Card padding={3} radius={2} tone={notice.tone} border>
            <Text size={1}>{notice.text}</Text>
          </Card>
        )}

        <Flex gap={2} wrap="wrap">
          <Button
            text={allSelected ? 'Tout décocher' : 'Tout cocher'}
            mode="ghost"
            disabled={loading || projects.length === 0 || deleting}
            onClick={toggleAll}
          />
          <Button
            text={`Supprimer (${selectedCount})`}
            tone="critical"
            disabled={selectedCount === 0 || deleting}
            onClick={() => void deleteSelected()}
          />
          <Button
            text="Actualiser"
            mode="bleed"
            disabled={loading || deleting}
            onClick={() => void load()}
          />
        </Flex>

        {loading ? (
          <Flex align="center" gap={2}>
            <Spinner muted />
            <Text muted size={1}>
              Chargement…
            </Text>
          </Flex>
        ) : projects.length === 0 ? (
          <Card padding={3} radius={2} tone="transparent" border>
            <Text muted size={1}>
              Aucun projet pour le moment.
            </Text>
          </Card>
        ) : (
          <Stack space={2}>
            {projects.map((project) => {
              const checked = selected.has(project._id)
              const label = project.title?.trim() || 'Sans titre'
              return (
                <Card key={project._id} padding={3} radius={2} border>
                  <Flex align="center" gap={3}>
                    <Checkbox
                      checked={checked}
                      onChange={() => toggle(project._id)}
                      disabled={deleting}
                      id={`project-${project._id}`}
                    />
                    <Box flex={1}>
                      <Text size={1} weight="medium">
                        <label htmlFor={`project-${project._id}`}>{label}</label>
                      </Text>
                    </Box>
                  </Flex>
                </Card>
              )
            })}
          </Stack>
        )}
      </Stack>
    </Card>
  )
}
