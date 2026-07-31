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
  href: string
  cover?: string
  collection?: string
}

// Articles are fetched from Medium's RSS at build time and sorted "best on top"
// (by claps when available, otherwise newest first). See scripts/fetch-medium.mjs.
export const medium = mediumData as MediumFeed
export const articles: Article[] = medium.articles

export const books: Book[] = [
  {
    title: 'Kafka Unleashed: Mastering the Power of Event-Driven Architecture',
    subtitle:
      'A comprehensive guide to real-time data streaming and scalability with Apache Kafka.',
    href: 'https://www.amazon.com/dp/B0DM9G96ZP',
    cover: '/books/kafka-unleashed.jpg',
  },
  {
    title: 'The Thinking Machine: A Plain-Language Guide to AI',
    subtitle:
      'An illustrated field guide to how artificial intelligence works, explained through everyday examples.',
    href: 'https://www.amazon.com/dp/B0H8K4ZMKR',
    cover: '/books/the-thinking-machine.jpg',
  },
  {
    title: 'Beyond Code',
    subtitle: 'The Engineering Behind It.',
    href: 'https://www.amazon.com/dp/B0H9DC3NSM',
    cover: '/books/beyond-code.jpg',
  },
  {
    title: 'The Growing System',
    subtitle: 'Design Patterns, SOLID, and System Design in Modern .NET.',
    href: 'https://www.amazon.com/dp/B0H8P336LX',
    cover: '/books/the-growing-system.jpg',
  },
  {
    title: 'The Load-Bearing System',
    subtitle: 'An Advanced Guide to System Design and Architecture.',
    href: 'https://www.amazon.in/dp/B0HCCM7SB5',
    cover: '/books/the-load-bearing-system.jpg',
  },
  {
    title: 'The Complete API Handbook',
    subtitle:
      'A story-driven guide to REST, GraphQL, gRPC, and system architecture — C# & .NET Edition.',
    href: 'https://www.amazon.com/dp/B0H9YPK4RQ',
    cover: '/books/complete-api-csharp.jpg',
    collection: 'The Complete API Handbook Series',
  },
  {
    title: 'The Complete API Handbook',
    subtitle:
      'A story-driven guide to REST, GraphQL, gRPC, and system architecture — Python & FastAPI Edition.',
    href: 'https://www.amazon.com/dp/B0H9X5YM9N',
    cover: '/books/complete-api-python.jpg',
    collection: 'The Complete API Handbook Series',
  },
  {
    title: 'The Complete API Handbook',
    subtitle:
      'A story-driven guide to REST, GraphQL, gRPC, and system architecture — JavaScript & Node.js Edition.',
    href: 'https://www.amazon.com/dp/B0H9H48R97',
    cover: '/books/complete-api-javascript.jpg',
    collection: 'The Complete API Handbook Series',
  },
]
