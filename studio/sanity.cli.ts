import { defineCliConfig } from 'sanity/cli';

export default defineCliConfig({
	api: {
		projectId: 'j2h3fv1f',
		dataset: 'production',
	},
	studioHost: 'portfolio-edgar',
	autoUpdates: true,
});
