import { defineType, defineField } from 'sanity';

export const project = defineType({
	name: 'project',
	title: 'Projet',
	type: 'document',
	fields: [
		defineField({
			name: 'name',
			title: 'Nom',
			type: 'string',
			validation: (rule) => rule.required(),
		}),
		defineField({
			name: 'tagline',
			title: 'Tagline',
			type: 'string',
			description: 'Courte description affichée après le nom (ex. Just For Riders)',
			validation: (rule) => rule.required(),
		}),
		defineField({
			name: 'href',
			title: 'Lien',
			type: 'url',
			validation: (rule) =>
				rule.required().uri({
					scheme: ['http', 'https'],
				}),
		}),
		defineField({
			name: 'image',
			title: 'Image',
			type: 'image',
			options: { hotspot: true },
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
			name: 'order',
			title: 'Ordre',
			type: 'number',
			description: 'Plus petit = affiché en premier',
			initialValue: 0,
			validation: (rule) => rule.required().integer(),
		}),
	],
	preview: {
		select: {
			title: 'name',
			subtitle: 'tagline',
			media: 'image',
		},
	},
	orderings: [
		{
			title: 'Ordre',
			name: 'orderAsc',
			by: [{ field: 'order', direction: 'asc' }],
		},
	],
});
