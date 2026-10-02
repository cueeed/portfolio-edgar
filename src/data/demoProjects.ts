import type { PortfolioProject } from '../components/Portfolio';

const servicesPool = [['Webdesign'], ['Branding'], ['Webdesign', 'Branding']];

const titles = [
	'Atelier Nord',
	'Maison Eluard',
	'Studio Kite',
	'Parc Lumen',
	'Brasserie Octave',
	'Galerie Mira',
	'Cabinet Solstice',
	'Forme Vive',
	'Hôtel Bellevue',
	'Éditions Rive',
	'Atelier Copper',
	'Signal Nocturne',
	'Villa Ardoise',
	'Collectif Orbit',
	'Marque Alba',
];

const descriptions = [
	'Identité claire et site vitrine pour une marque artisanale.',
	'Système visuel minimal et expérience web soignée.',
	'Direction artistique et interface pour un lancement produit.',
	'Refonte d’image et site éditorial responsive.',
	'Charte graphique et presence digitale unifiées.',
	'Portfolio interactif et langage visuel distinctif.',
	'Site institutionnel sobre, typographie affirmée.',
	'Motion et UI pour une campagne de lancement.',
	'Identité hôtelière et parcours de réservation.',
	'Couverture éditoriale et micro-site de collection.',
	'Branding atelier et site catalogue.',
	'Univers nocturne, UI et animations légères.',
	'Marque immobilière premium et landings.',
	'Plateforme collective et design system léger.',
	'Identité beauté et e-commerce sur mesure.',
];

/** 15 projets fictifs pour tester le scroll horizontal. */
export const demoProjects: PortfolioProject[] = titles.map((title, i) => {
	const year = 2018 + (i % 8);
	const month = (i % 12) + 1;
	const dateLabel = new Date(year, month - 1, 1).toLocaleDateString('fr-FR', {
		month: 'long',
		year: 'numeric',
	});

	return {
		id: `demo-${i + 1}`,
		title,
		dateLabel,
		services: servicesPool[i % servicesPool.length],
		shortDescription: descriptions[i],
		coverImageUrl: `https://picsum.photos/seed/edgar-folio-${i + 1}/600/960`,
		coverAlt: `Visuel du projet ${title}`,
		externalUrl: i % 3 === 0 ? `https://example.com/${title.toLowerCase().replace(/\s+/g, '-')}` : null,
		index: i,
	};
});

/** Priorise Sanity, complète jusqu’à 15 avec les démos. */
export function withDemoProjects(projects: PortfolioProject[], target = 15): PortfolioProject[] {
	if (projects.length >= target) {
		return projects.slice(0, target).map((p, index) => ({ ...p, index }));
	}

	const needed = target - projects.length;
	const fillers = demoProjects.slice(0, needed).map((p, i) => ({
		...p,
		id: `demo-fill-${i + 1}`,
		index: projects.length + i,
	}));

	return [...projects.map((p, index) => ({ ...p, index })), ...fillers];
}
