// @ts-nocheck — @sanity/ui v4 typings conflict with React 19
import {useState} from 'react'
import {Box, Button, Card, Stack, Text} from '@sanity/ui'

const BUILD_HOOK =
  (typeof process !== 'undefined' && process.env.SANITY_STUDIO_NETLIFY_BUILD_HOOK) ||
  (import.meta.env.SANITY_STUDIO_NETLIFY_BUILD_HOOK as string | undefined)

type Notice = {tone: 'positive' | 'critical' | 'caution'; text: string} | null

export function DeploySite() {
  const [deploying, setDeploying] = useState(false)
  const [notice, setNotice] = useState<Notice>(null)

  const deploy = async () => {
    if (!BUILD_HOOK) {
      setNotice({
        tone: 'caution',
        text: 'Variable manquante : SANITY_STUDIO_NETLIFY_BUILD_HOOK. Redéploie le Studio après l’avoir ajoutée.',
      })
      return
    }

    const confirmed = window.confirm(
      'Lancer un déploiement Netlify maintenant ?\n\nLe site sera reconstruit avec le contenu Sanity actuel (quelques minutes).',
    )
    if (!confirmed) return

    setDeploying(true)
    setNotice(null)
    try {
      const response = await fetch(BUILD_HOOK, {method: 'POST'})
      if (!response.ok) {
        throw new Error(`Netlify a répondu ${response.status}`)
      }
      setNotice({
        tone: 'positive',
        text: 'Déploiement lancé. Le site se met à jour sur Netlify (1–3 minutes).',
      })
    } catch (error) {
      setNotice({
        tone: 'critical',
        text: error instanceof Error ? error.message : String(error),
      })
    } finally {
      setDeploying(false)
    }
  }

  return (
    <Card height="fill" padding={4} sizing="border">
      <Stack space={4} style={{maxWidth: 40 * 16}}>
        <Stack space={2}>
          <Text size={3} weight="semibold">
            Mettre en ligne
          </Text>
          <Text muted size={1}>
            Publie ou modifie autant de projets que tu veux dans Sanity, puis lance un seul
            déploiement quand tu es prêt.
          </Text>
        </Stack>

        {notice && (
          <Card padding={3} radius={2} tone={notice.tone} border>
            <Text size={1}>{notice.text}</Text>
          </Card>
        )}

        <Card padding={3} radius={2} tone="primary" border>
          <Stack space={3}>
            <Text size={1}>
              Le bouton demande à Netlify de reconstruire le site avec le contenu actuel du dataset{' '}
              <code>production</code>.
            </Text>
            <Box>
              <Button
                text={deploying ? 'Déploiement en cours…' : 'Mettre le site en ligne'}
                tone="positive"
                disabled={deploying || !BUILD_HOOK}
                onClick={() => void deploy()}
              />
            </Box>
            {!BUILD_HOOK && (
              <Text size={0} muted>
                Variable manquante : <code>SANITY_STUDIO_NETLIFY_BUILD_HOOK</code>
              </Text>
            )}
          </Stack>
        </Card>
      </Stack>
    </Card>
  )
}
