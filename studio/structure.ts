import {Icon} from '@sanity/icons'
import {createElement} from 'react'
import type {StructureResolver} from 'sanity/structure'
import {DeploySite} from './tools/DeploySite'
import {ProjectsListPane} from './tools/ProjectsListPane'

const API_VERSION = '2026-03-01'

export const structure: StructureResolver = (S, context) => {
  const client = context.getClient({apiVersion: API_VERSION})

  const projectsMenuItems = [
    S.menuItem()
      .title('Créer un projet')
      .icon(() => createElement(Icon, {symbol: 'add-document'}))
      .intent({type: 'create', params: {type: 'project'}})
      .serialize(),
    S.menuItem()
      .title('Réinitialiser l’ordre')
      .icon(() => createElement(Icon, {symbol: 'sort'}))
      .action('resetOrder')
      .serialize(),
    S.menuItem()
      .title('Supprimer des projets')
      .icon(() => createElement(Icon, {symbol: 'trash'}))
      .action('bulkDelete')
      .serialize(),
  ]

  return S.list()
    .title('Portfolio')
    .items([
      S.listItem()
        .title('Projets')
        .id('orderable-project')
        .icon(() => createElement(Icon, {symbol: 'projects'}))
        .schemaType('project')
        .child(
          Object.assign(
            S.documentTypeList('project')
              .canHandleIntent((_intentName, params) => params?.type === 'project')
              .serialize(),
            {
              __preserveInstance: true,
              key: 'orderable-project',
              type: 'component',
              component: ProjectsListPane,
              options: {
                type: 'project',
                client,
              },
              menuItems: projectsMenuItems,
            },
          ),
        ),
      S.divider(),
      S.listItem()
        .title('Mettre en ligne')
        .icon(() => createElement(Icon, {symbol: 'rocket'}))
        .child(S.component(DeploySite).title('Mettre en ligne').id('deploy-site')),
    ])
}
