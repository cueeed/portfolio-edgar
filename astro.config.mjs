// @ts-check
import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';
import sanity from '@sanity/astro';
import react from '@astrojs/react';

const { PUBLIC_SANITY_PROJECT_ID, PUBLIC_SANITY_DATASET } = loadEnv(
	process.env.NODE_ENV ?? 'development',
	process.cwd(),
	'',
);

// https://astro.build/config
export default defineConfig({
	integrations: [
		sanity({
			projectId: PUBLIC_SANITY_PROJECT_ID,
			dataset: PUBLIC_SANITY_DATASET,
			apiVersion: '2026-03-01',
			// Site statique : données fraîches au build, pas via CDN
			useCdn: false,
			// Pas de Studio embarqué — Studio séparé dans /studio (sanity deploy)
		}),
		// React reste pour d’éventuels composants UI ; le Studio n’est plus monté ici
		react(),
	],
	image: {
		domains: ['cdn.sanity.io'],
	},
});
