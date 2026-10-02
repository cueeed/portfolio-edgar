/**
 * Seed Sanity with demo portfolio projects.
 * Run from /studio: npx sanity exec ../scripts/seed-demo-projects.ts --with-user-token
 */
import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2026-03-01'})

const servicesPool = [
  ['Identité visuelle'],
  ['Site web'],
  ['UI / Interface'],
  ['Motion'],
  ['Identité visuelle', 'Site web'],
  ['UI / Interface', 'Motion'],
  ['Direction artistique', 'Site web'],
  ['Branding', 'UI / Interface'],
]

const demos = [
  {
    title: 'Atelier Nord',
    client: 'Nord & Co',
    shortDescription: 'Identité claire et site vitrine pour une marque artisanale.',
  },
  {
    title: 'Maison Eluard',
    client: 'Eluard SAS',
    shortDescription: 'Système visuel minimal et expérience web soignée.',
  },
  {
    title: 'Studio Kite',
    client: 'Kite Agency',
    shortDescription: 'Direction artistique et interface pour un lancement produit.',
  },
  {
    title: 'Parc Lumen',
    client: 'Ville de Lyon',
    shortDescription: 'Refonte d’image et site éditorial responsive.',
  },
  {
    title: 'Brasserie Octave',
    client: 'Octave Groupe',
    shortDescription: 'Charte graphique et presence digitale unifiées.',
  },
  {
    title: 'Galerie Mira',
    client: 'Mira Art',
    shortDescription: 'Portfolio interactif et langage visuel distinctif.',
  },
  {
    title: 'Cabinet Solstice',
    client: 'Solstice Avocats',
    shortDescription: 'Site institutionnel sobre, typographie affirmée.',
  },
  {
    title: 'Forme Vive',
    client: 'Forme Vive',
    shortDescription: 'Motion et UI pour une campagne de lancement.',
  },
  {
    title: 'Hôtel Bellevue',
    client: 'Bellevue Hospitality',
    shortDescription: 'Identité hôtelière et parcours de réservation.',
  },
  {
    title: 'Éditions Rive',
    client: 'Rive Presse',
    shortDescription: 'Couverture éditoriale et micro-site de collection.',
  },
  {
    title: 'Atelier Copper',
    client: 'Copper Studio',
    shortDescription: 'Branding atelier et site catalogue.',
  },
  {
    title: 'Signal Nocturne',
    client: 'Nocturne Lab',
    shortDescription: 'Univers nocturne, UI et animations légères.',
  },
  {
    title: 'Villa Ardoise',
    client: 'Ardoise Immob.',
    shortDescription: 'Marque immobilière premium et landings.',
  },
  {
    title: 'Collectif Orbit',
    client: 'Orbit Collab',
    shortDescription: 'Plateforme collective et design system léger.',
  },
  {
    title: 'Marque Alba',
    client: 'Alba Beauty',
    shortDescription: 'Identité beauté et e-commerce sur mesure.',
  },
]

function slugify(title: string) {
  return title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

async function uploadCover(seed: number, alt: string) {
  const url = `https://picsum.photos/seed/edgar-folio-${seed}/900/1400`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Image fetch failed: ${url} (${res.status})`)
  const buffer = Buffer.from(await res.arrayBuffer())
  const asset = await client.assets.upload('image', buffer, {
    filename: `demo-${seed}.jpg`,
    contentType: 'image/jpeg',
  })
  return {
    _type: 'image' as const,
    asset: {_type: 'reference' as const, _ref: asset._id},
    alt,
  }
}

async function main() {
  console.log('Seeding demo projects into Sanity…')

  // Remove previous demo-seeded docs (ids demo-*)
  const existing = await client.fetch<string[]>(
    `*[_type == "project" && _id in $ids]._id`,
    {ids: demos.map((_, i) => `demo-project-${i + 1}`)},
  )
  if (existing.length) {
    const tx = client.transaction()
    existing.forEach((id) => tx.delete(id))
    await tx.commit()
    console.log(`Deleted ${existing.length} previous demo docs`)
  }

  for (let i = 0; i < demos.length; i++) {
    const demo = demos[i]
    const id = `demo-project-${i + 1}`
    const slug = slugify(demo.title)
    const coverImage = await uploadCover(i + 1, `Visuel du projet ${demo.title}`)

    await client.createOrReplace({
      _id: id,
      _type: 'project',
      title: demo.title,
      slug: {_type: 'slug', current: slug},
      client: demo.client,
      year: 2018 + (i % 8),
      services: servicesPool[i % servicesPool.length],
      coverImage,
      shortDescription: demo.shortDescription,
      externalUrl:
        i % 3 === 0
          ? `https://example.com/${slug}`
          : undefined,
      featured: true,
    })

    console.log(`✓ ${demo.title}`)
  }

  console.log(`Done — ${demos.length} projects seeded.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
