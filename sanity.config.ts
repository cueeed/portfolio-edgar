import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {schemaTypes} from './studio/schemaTypes'
import {studioTools} from './studio/tools'

export default defineConfig({
  name: 'default',
  title: 'Portfolio Edgar',
  projectId: 'j2h3fv1f',
  dataset: 'production',
  plugins: [structureTool()],
  tools: (prev) => [...prev, ...studioTools],
  schema: {
    types: schemaTypes,
  },
})
