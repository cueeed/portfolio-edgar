import {Icon} from '@sanity/icons'
import {createElement} from 'react'
import type {Tool} from 'sanity'
import {BulkDeleteProjects} from './BulkDeleteProjects'
import {DeploySite} from './DeploySite'

export const studioTools: Tool[] = [
  {
    name: 'deploy-site',
    title: 'Mettre en ligne',
    icon: () => createElement(Icon, {symbol: 'rocket'}),
    component: DeploySite,
  },
  {
    name: 'bulk-delete-projects',
    title: 'Supprimer des projets',
    icon: () => createElement(Icon, {symbol: 'trash'}),
    component: BulkDeleteProjects,
  },
]
