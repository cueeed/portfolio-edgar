import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemaTypes'
import {studioTools} from './tools'

export default defineConfig({
  name: 'default',
  title: 'Portfolio Edgar',

  projectId: 'j2h3fv1f',
  dataset: 'production',

  plugins: [structureTool(), visionTool()],

  tools: (prev) => [...prev, ...studioTools],

  schema: {
    types: schemaTypes,
  },
})
