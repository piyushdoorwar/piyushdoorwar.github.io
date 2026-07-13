import mediumData from './medium.generated.json'

export interface Article {
  id: string | null
  title: string
  url: string
  publishedAt: string | null
  tags: string[]
  subtitle: string
  readingTimeMin: number
  claps: number | null
  comments: number | null
}

export interface MediumFeed {
  generatedAt: string | null
  /** True when claps/comments were fetched (RapidAPI key was set at build time). */
  hasEngagement: boolean
  articles: Article[]
}

export interface Book {
  title: string
  subtitle?: string
  href: string // Amazon / KDP link — TODO
  cover?: string // path under /public — TODO
}

// Articles are fetched from Medium's RSS at build time and sorted "best on top"
// (by claps when available, otherwise newest first). See scripts/fetch-medium.mjs.
export const medium = mediumData as MediumFeed
export const articles: Article[] = medium.articles

// TODO: add real book entries (title, Amazon/KDP link, optional cover in /public).
export const books: Book[] = [
  // {
  //   title: 'Your Book Title',
  //   subtitle: 'A short subtitle',
  //   href: 'https://www.amazon.com/dp/XXXXXXXXXX',
  //   cover: '/books/your-book.jpg',
  // },
]
