import { sanityClient } from 'sanity:client';
import type { SanityImageSource } from '@sanity/image-url';
import { urlFor } from './image';

export interface Project {
	_id: string;
	name: string;
	tagline: string;
	href: string;
	image: SanityImageSource;
	alt: string;
	order: number;
}

export interface ProjectCard {
	_id: string;
	name: string;
	tagline: string;
	href: string;
	imageUrl: string;
	alt: string;
	index: number;
}

const projectsQuery = `*[_type == "project" && defined(image)] | order(order asc) {
  _id,
  name,
  tagline,
  href,
  image,
  "alt": coalesce(image.alt, name),
  order
}`;

export async function getProjects(): Promise<ProjectCard[]> {
	const projects = await sanityClient.fetch<Project[]>(projectsQuery);

	return projects.map((project, index) => ({
		_id: project._id,
		name: project.name,
		tagline: project.tagline,
		href: project.href,
		imageUrl: urlFor(project.image).width(1200).height(1800).fit('crop').auto('format').url(),
		alt: project.alt,
		index,
	}));
}
