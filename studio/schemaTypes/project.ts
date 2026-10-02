import {defineType, defineField, defineArrayMember} from 'sanity'

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
      name: 'client',
      title: 'Client',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'year',
      title: 'Année',
      type: 'number',
      validation: (rule) =>
        rule.required().integer().min(2000).max(new Date().getFullYear() + 1),
    }),
    defineField({
      name: 'category',
      title: 'Catégorie',
      type: 'string',
      options: {
        list: [
          {title: 'UI', value: 'ui'},
          {title: 'Branding', value: 'branding'},
          {title: 'Motion', value: 'motion'},
          {title: 'Web', value: 'web'},
        ],
        layout: 'radio',
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'coverImage',
      title: 'Image de couverture',
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
      name: 'gallery',
      title: 'Galerie',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'image',
          options: {hotspot: true},
          fields: [
            defineField({
              name: 'alt',
              title: 'Texte alternatif',
              type: 'string',
            }),
            defineField({
              name: 'caption',
              title: 'Légende',
              type: 'string',
            }),
          ],
        }),
      ],
    }),
    defineField({
      name: 'shortDescription',
      title: 'Description courte',
      type: 'text',
      rows: 3,
      description: 'Résumé affiché dans la grille et sous le titre de la page détail.',
      validation: (rule) => rule.required().max(280),
    }),
    defineField({
      name: 'body',
      title: 'Contenu',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'block',
          styles: [
            {title: 'Normal', value: 'normal'},
            {title: 'Titre 2', value: 'h2'},
            {title: 'Titre 3', value: 'h3'},
            {title: 'Citation', value: 'blockquote'},
          ],
          lists: [
            {title: 'Puces', value: 'bullet'},
            {title: 'Numérotée', value: 'number'},
          ],
          marks: {
            decorators: [
              {title: 'Gras', value: 'strong'},
              {title: 'Italique', value: 'em'},
            ],
            annotations: [
              {
                name: 'link',
                type: 'object',
                title: 'Lien',
                fields: [
                  defineField({
                    name: 'href',
                    title: 'URL',
                    type: 'url',
                    validation: (rule) =>
                      rule.uri({
                        scheme: ['http', 'https', 'mailto', 'tel'],
                      }),
                  }),
                ],
              },
            ],
          },
        }),
        defineArrayMember({
          type: 'image',
          options: {hotspot: true},
          fields: [
            defineField({
              name: 'alt',
              title: 'Texte alternatif',
              type: 'string',
            }),
          ],
        }),
      ],
    }),
    defineField({
      name: 'externalUrl',
      title: 'Lien externe',
      type: 'url',
      description: 'Lien vers le site live ou Behance (optionnel).',
      validation: (rule) =>
        rule.uri({
          scheme: ['http', 'https'],
        }),
    }),
    defineField({
      name: 'featured',
      title: 'Mis en avant',
      type: 'boolean',
      description: 'Afficher ce projet sur la page d’accueil.',
      initialValue: false,
    }),
  ],
  orderings: [
    {
      title: 'Année (récent → ancien)',
      name: 'yearDesc',
      by: [{field: 'year', direction: 'desc'}],
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
      client: 'client',
      year: 'year',
      media: 'coverImage',
      featured: 'featured',
    },
    prepare({title, client, year, media, featured}) {
      return {
        title: featured ? `★ ${title}` : title,
        subtitle: [client, year].filter(Boolean).join(' · '),
        media,
      }
    },
  },
})
