import { sanityClient } from 'sanity:client';
import type { SanityImageSource } from '@sanity/image-url';
import { urlFor } from './image';

export type ProjectCategory = 'ui' | 'branding' | 'motion' | 'web';

export const categoryLabels: Record<ProjectCategory, string> = {
	ui: 'UI / Interface',
	branding: 'Identité visuelle',
	motion: 'Motion',
	web: 'Site web',
};

export interface SanityProject {
	_id: string;
	title: string;
	slug: string;
	client: string;
	year: number;
	category?: ProjectCategory | null;
	services?: string[] | null;
	coverImage: SanityImageSource;
	coverAlt: string;
	shortDescription: string;
	externalUrl?: string | null;
	featured?: boolean;
	body?: unknown[];
	gallery?: Array<{
		asset?: SanityImageSource;
		alt?: string;
		caption?: string;
	} & SanityImageSource>;
}

export interface ProjectCard {
	_id: string;
	title: string;
	slug: string;
	client: string;
	year: number;
	services: string[];
	categoryLabel: string;
	shortDescription: string;
	coverImageUrl: string;
	coverAlt: string;
	href: string;
	externalUrl?: string | null;
	index: number;
}

const projectCardFields = /* groq */ `
  _id,
  title,
  "slug": slug.current,
  client,
  year,
  category,
  services,
  coverImage,
  "coverAlt": coalesce(coverImage.alt, title),
  shortDescription,
  externalUrl,
  featured
`;

const projectDetailFields = /* groq */ `
  ${projectCardFields},
  body[]{
    ...,
    _type == "image" => {
      ...,
      asset->
    }
  },
  gallery[]{
    ...,
    asset->
  }
`;

function resolveServices(project: SanityProject): string[] {
	if (project.services && project.services.length > 0) {
		return project.services;
	}

	if (project.category) {
		return [categoryLabels[project.category] ?? project.category];
	}

	return [];
}

function toCard(project: SanityProject, index: number): ProjectCard {
	const services = resolveServices(project);

	return {
		_id: project._id,
		title: project.title,
		slug: project.slug,
		client: project.client,
		year: project.year,
		services,
		categoryLabel: services.join(' · ') || '—',
		shortDescription: project.shortDescription,
		coverImageUrl: urlFor(project.coverImage)
			.width(900)
			.height(1400)
			.fit('crop')
			.auto('format')
			.url(),
		coverAlt: project.coverAlt,
		href: `/projets/${project.slug}`,
		externalUrl: project.externalUrl,
		index,
	};
}

/** Tous les projets publiés (grille + getStaticPaths). */
export async function getProjects(): Promise<ProjectCard[]> {
	const projects = await sanityClient.fetch<SanityProject[]>(
		`*[_type == "project" && defined(slug.current) && defined(coverImage)] | order(year desc, title asc) {
      ${projectCardFields}
    }`,
	);

	return projects.map(toCard);
}

/** Projets mis en avant pour la home — fallback sur tous s’il n’y en a aucun. */
export async function getHomepageProjects(): Promise<ProjectCard[]> {
	const featured = await sanityClient.fetch<SanityProject[]>(
		`*[_type == "project" && featured == true && defined(slug.current) && defined(coverImage)] | order(year desc, title asc) {
      ${projectCardFields}
    }`,
	);

	if (featured.length > 0) {
		return featured.map(toCard);
	}

	return getProjects();
}

export async function getProjectBySlug(slug: string): Promise<SanityProject | null> {
	return sanityClient.fetch<SanityProject | null>(
		`*[_type == "project" && slug.current == $slug][0]{
      ${projectDetailFields}
    }`,
		{ slug },
	);
}

export function galleryImageUrl(image: SanityImageSource, width = 1600) {
	return urlFor(image).width(width).auto('format').url();
}
