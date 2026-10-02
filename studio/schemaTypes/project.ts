import {defineType, defineField} from 'sanity'

export const project = defineType({
  name: 'project',
  title: 'Projet',
  type: 'document',
  fields: [
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
      options: {hotspot: true},
      fields: [
        defineField({
          name: 'alt',
          title: 'Texte alternatif',
          type: 'string',
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
      validation: (rule) => rule.required().max(220),
    }),
    defineField({
      name: 'externalUrl',
      title: 'Lien externe',
      type: 'url',
      description: 'URL du bouton « Voir le site » (optionnel).',
      validation: (rule) =>
        rule.uri({
          scheme: ['http', 'https'],
        }),
    }),
  ],
  orderings: [
    {
      title: 'Date (récent → ancien)',
      name: 'dateDesc',
      by: [{field: 'date', direction: 'desc'}],
    },
    {
      title: 'Titre A→Z',
      name: 'titleAsc',
      by: [{field: 'title', direction: 'asc'}],
    },
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
