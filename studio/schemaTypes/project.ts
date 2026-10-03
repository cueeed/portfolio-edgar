import {orderRankField, orderRankOrdering} from '@sanity/orderable-document-list'
import {defineField, defineType} from 'sanity'

export const project = defineType({
  name: 'project',
  title: 'Projet',
  type: 'document',
  orderings: [orderRankOrdering],
  fields: [
    orderRankField({type: 'project'}),
    defineField({
      name: 'title',
      title: 'Titre',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      description: 'Généré automatiquement à partir du titre.',
      options: {
        source: 'title',
        maxLength: 96,
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'date',
      title: 'Date',
      type: 'date',
      description: 'Mois et année du projet.',
      options: {
        dateFormat: 'MMMM YYYY',
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'services',
      title: 'Prestations',
      type: 'array',
      of: [{type: 'string'}],
      options: {
        list: [
          {title: 'Webdesign', value: 'Webdesign'},
          {title: 'Branding', value: 'Branding'},
        ],
        layout: 'grid',
      },
      validation: (rule) => rule.min(1).error('Choisis au moins une prestation.'),
    }),
    defineField({
      name: 'coverImage',
      title: 'Image',
      type: 'image',
      description:
        'Dimensions recommandées : 1200 × 1800 px (portrait, ratio 2:3). Format JPG ou WebP.',
      options: {hotspot: true},
      fields: [
        defineField({
          name: 'alt',
          title: 'Texte alternatif',
          type: 'string',
          description: 'Courte description de l’image pour l’accessibilité.',
          validation: (rule) => rule.required(),
        }),
      ],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'shortDescription',
      title: 'Description courte',
      type: 'text',
      rows: 3,
      description: 'Optionnel. Affichée dans le détail du projet.',
      validation: (rule) => rule.max(220),
    }),
    defineField({
      name: 'externalUrl',
      title: 'Lien du site',
      type: 'url',
      description: 'Optionnel. URL du bouton « Voir le site ».',
      validation: (rule) =>
        rule.uri({
          scheme: ['http', 'https'],
        }),
    }),
  ],
  preview: {
    select: {
      title: 'title',
      date: 'date',
      services: 'services',
      media: 'coverImage',
    },
    prepare({title, date, services, media}) {
      let dateLabel = ''
      if (date) {
        dateLabel = new Date(`${date}T12:00:00`).toLocaleDateString('fr-FR', {
          month: 'short',
          year: 'numeric',
        })
      }

      const servicesLabel = Array.isArray(services) ? services.join(' · ') : ''

      return {
        title: title || 'Sans titre',
        subtitle: [dateLabel, servicesLabel].filter(Boolean).join(' · '),
        media,
      }
    },
  },
})
