import { createImageUrlBuilder } from '@sanity/image-url';
import { sanityClient } from 'sanity:client';
import type { SanityImageSource } from '@sanity/image-url';

const builder = createImageUrlBuilder(sanityClient);

export function urlFor(source: SanityImageSource) {
	return builder.image(source);
}
