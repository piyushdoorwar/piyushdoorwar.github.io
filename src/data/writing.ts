export interface Article {
  title: string
  outlet: string
  href: string
  date: string // ISO or human-friendly
}

export interface Book {
  title: string
  subtitle?: string
  href: string // Amazon / KDP link — TODO
  cover?: string // path under /public — TODO
}

export const articles: Article[] = [
  {
    title: 'Getting familiar with Couchbase for .NET SDK 3',
    outlet: 'Medium',
    href: 'https://medium.com/@piyushdoorwar', // TODO: exact article URL
    date: '2021-04-02',
  },
  {
    title: 'Getting Started with Kafka in C#',
    outlet: 'Medium',
    href: 'https://medium.com/@piyushdoorwar', // TODO: exact article URL
    date: '2021-03-27',
  },
]

// TODO: add real book entries (title, Amazon/KDP link, optional cover in /public).
export const books: Book[] = [
  // {
  //   title: 'Your Book Title',
  //   subtitle: 'A short subtitle',
  //   href: 'https://www.amazon.com/dp/XXXXXXXXXX',
  //   cover: '/books/your-book.jpg',
  // },
]
