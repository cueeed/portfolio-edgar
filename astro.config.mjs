// @ts-check
import { defineConfig } from 'astro/config';
import sanity from '@sanity/astro';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
	integrations: [
		sanity({
			projectId: 'j2h3fv1f',
			dataset: 'production',
			apiVersion: '2026-03-01',
			// Static site: fetch at build time, not via CDN edge cache of drafts
			useCdn: false,
			studioBasePath: '/admin',
		}),
		react(),
	],
	image: {
		domains: ['cdn.sanity.io'],
	},
});
