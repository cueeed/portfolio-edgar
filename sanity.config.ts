import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {schemaTypes} from './studio/schemaTypes'

export default defineConfig({
  name: 'default',
  title: 'Portfolio Edgar',
  projectId: 'j2h3fv1f',
  dataset: 'production',
  plugins: [structureTool()],
  schema: {
    types: schemaTypes,
  },
})
