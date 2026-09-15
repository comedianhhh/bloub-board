export interface ListingMetadata {
  title: string
  description: string
  imageUrl: string | null
}

export type MetadataField = 'title' | 'description'

export type MetadataResult =
  | { ok: true; metadata: ListingMetadata }
  | { ok: false; missing: MetadataField[]; metadata: ListingMetadata }

const TITLE_MAX = 80
const DESCRIPTION_MAX = 240

export function sanitizeListingMetadata(input: {
  title?: string
  description?: string
  imageUrl?: string | null
}): ListingMetadata {
  return {
    title: clip(input.title ?? '', TITLE_MAX),
    description: clip(input.description ?? '', DESCRIPTION_MAX),
    imageUrl: publicImageUrl(input.imageUrl),
  }
}

// A live listing's display content is locked by the payment that first put it
// on the board. Anyone may add money to it after that, but nobody can rewrite
// it, so sponsoring a listing can never deface it.
export function completeListingMetadata(
  submitted: ListingMetadata,
  locked: ListingMetadata | null,
): MetadataResult {
  const metadata = sanitizeListingMetadata({
    title: locked?.title || submitted.title,
    description: locked?.description || submitted.description,
    // A missing image is a deliberate state, not a gap the submitter may fill:
    // the board falls back to a favicon. Treating it as a gap would let a
    // sponsor put an arbitrary image on someone else's listing.
    imageUrl: locked ? locked.imageUrl : submitted.imageUrl,
  })
  const missing: MetadataField[] = []
  if (!metadata.title) missing.push('title')
  if (!metadata.description) missing.push('description')
  if (missing.length > 0) return { ok: false, missing, metadata }
  return { ok: true, metadata }
}

function clip(value: string, max: number): string {
  return value.trim().replace(/\s+/g, ' ').slice(0, max)
}

function publicImageUrl(value: string | null | undefined): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return url.toString()
  } catch {
    return null
  }
}
