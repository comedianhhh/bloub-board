import type { RankableListing } from '../domain/ranking'

export interface Listing extends RankableListing {
  contributionCents: number
  description: string
  domain: string
  href: string
  identityInput: string
  image: string | null
  clicks: number
  age: string
}
