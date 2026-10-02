import { sanityClient } from 'sanity:client';
import type { SanityImageSource } from '@sanity/image-url';
import { urlFor } from './image';

export interface SanityProject {
	_id: string;
	title: string;
	slug: string;
	date?: string | null;
	year?: number | null;
	client?: string | null;
	services?: string[] | null;
	coverImage: SanityImageSource;
	coverAlt: string;
	shortDescription: string;
	externalUrl?: string | null;
}

export interface ProjectCard {
	_id: string;
	title: string;
	slug: string;
	dateLabel: string;
	year: number;
	services: string[];
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
  date,
  year,
  client,
  services,
  coverImage,
  "coverAlt": coalesce(coverImage.alt, title),
  shortDescription,
  externalUrl
`;

export function formatProjectDate(project: Pick<SanityProject, 'date' | 'year'>): string {
	if (project.date) {
		return new Date(`${project.date}T12:00:00`).toLocaleDateString('fr-FR', {
			month: 'long',
			year: 'numeric',
		});
	}

	if (project.year) {
		return String(project.year);
	}

	return '—';
}

function resolveYear(project: SanityProject): number {
	if (project.date) {
		return new Date(`${project.date}T12:00:00`).getFullYear();
	}
	return project.year ?? 0;
}

function toCard(project: SanityProject, index: number): ProjectCard {
	const services = project.services ?? [];

	return {
		_id: project._id,
		title: project.title,
		slug: project.slug,
		dateLabel: formatProjectDate(project),
		year: resolveYear(project),
		services,
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
		`*[_type == "project" && defined(slug.current) && defined(coverImage)] | order(coalesce(date, string(year) + "-01-01") desc, title asc) {
      ${projectCardFields}
    }`,
	);

	return projects.map(toCard);
}

/** Projets de la home — tous les projets publiés. */
export async function getHomepageProjects(): Promise<ProjectCard[]> {
	return getProjects();
}

export async function getProjectBySlug(slug: string): Promise<SanityProject | null> {
	return sanityClient.fetch<SanityProject | null>(
		`*[_type == "project" && slug.current == $slug][0]{
      ${projectCardFields}
    }`,
		{ slug },
	);
}
