import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {schemaTypes} from './studio/schemaTypes'
import {structure} from './studio/structure'

export default defineConfig({
  name: 'default',
  title: 'Portfolio Edgar',
  projectId: 'j2h3fv1f',
  dataset: 'production',
  plugins: [structureTool({structure})],

  // Pas de Releases / planification (trop pour un portfolio)
  releases: {enabled: false},
  scheduledDrafts: {enabled: false},

  schema: {
    types: schemaTypes,
  },
})
