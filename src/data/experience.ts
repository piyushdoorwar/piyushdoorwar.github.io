export interface Position {
  role: string
  /** 'YYYY-MM' */
  start: string
  /** 'YYYY-MM' or null for the current role ("Present"). */
  end: string | null
}

export interface Experience {
  id: string
  company: string
  /**
   * Optional logo path under /public (e.g. '/logos/studyin.svg').
   * When omitted, a monogram of the company initials is shown instead.
   */
  logo?: string
  /** Intrinsic logo dimensions (from the SVG viewBox) used for the <img> aspect ratio. */
  logoWidth?: number
  logoHeight?: number
  location?: string
  workMode?: 'Remote' | 'Hybrid' | 'On-site'
  employmentType?: 'Full-time' | 'Internship' | 'Contract'
  /** Hex accent used for the card's gradient wash. */
  accent: string
  /** Positions at this company, most recent first. */
  positions: Position[]
  highlights: string[]
  /** Optional award/recognition earned here. */
  award?: string
}

// Sourced from Piyush's LinkedIn (reverse-chronological). Descriptions are the
// public summaries; expand any bullet with the full text whenever you like.
export const experiences: Experience[] = [
  {
    id: 'studyin',
    company: 'StudyIn',
    logo: '/logos/studyin.svg',
    logoWidth: 179,
    logoHeight: 40,
    location: 'Noida, India',
    workMode: 'Remote',
    employmentType: 'Full-time',
    accent: '#3ddc84',
    positions: [{ role: 'Lead Engineer', start: '2025-07', end: null }],
    highlights: [
      'Leading backend engineering for a greenfield platform — architecting a high-traffic, cloud-native microservices ecosystem designed for scale.',
    ],
    award: 'CEO Award — “Take the Initiative”',
  },
  {
    id: 'vistra',
    company: 'VISTRA',
    logo: '/logos/vistra.svg',
    logoWidth: 775,
    logoHeight: 150,
    location: 'Mumbai, India',
    workMode: 'Hybrid',
    employmentType: 'Full-time',
    accent: '#a78bfa',
    positions: [
      { role: 'Senior Software Developer', start: '2025-04', end: '2025-07' },
      { role: 'Software Developer', start: '2023-07', end: '2025-03' },
    ],
    highlights: [
      'Spearheaded the modernization of a legacy payroll system by architecting a high-performance, domain-oriented SaaS platform.',
    ],
  },
  {
    id: 'rxo',
    company: 'RXO',
    logo: '/logos/rxo.svg',
    logoWidth: 425,
    logoHeight: 149,
    location: 'Mumbai, India',
    workMode: 'Hybrid',
    employmentType: 'Full-time',
    accent: '#22d3ee',
    positions: [{ role: 'Software Engineer', start: '2021-11', end: '2023-07' }],
    highlights: [
      'Architectural modernization: transitioned the customer domain from legacy monoliths to a high-performance, cloud-native microservices architecture.',
    ],
    award: 'Technology Award Q3-2022',
  },
  {
    id: 'infosys',
    company: 'Infosys',
    logo: '/logos/infosys.svg',
    logoWidth: 368,
    logoHeight: 136,
    location: 'Pune, India',
    workMode: 'Hybrid',
    employmentType: 'Full-time',
    accent: '#60a5fa',
    positions: [
      { role: 'Specialist Programmer', start: '2021-04', end: '2021-11' },
      { role: 'Systems Engineer Specialist', start: '2019-07', end: '2021-03' },
    ],
    highlights: [
      'Migrated a legacy monolithic TMS to domain-oriented microservices for RXO (XPO Logistics), enabling independent scaling of core logistics components — earned the XPO Scholar LOB Award.',
      'Built and optimised finance APIs for the Last Mile TMS Billing & Settlement module, streamlining carrier deduction, settlement-fee and transaction-reversal workflows for a high-volume logistics platform.',
    ],
    award: 'STG Excellence Award (Ninja, Q4 FY20) · INSTA Award',
  },
  {
    id: 'geeksforgeeks',
    company: 'GeeksforGeeks',
    logo: '/logos/geeksforgeeks.svg',
    logoWidth: 59,
    logoHeight: 30,
    location: 'Noida, India',
    workMode: 'Remote',
    employmentType: 'Internship',
    accent: '#f59e0b',
    positions: [{ role: 'Technical Content Writer', start: '2016-11', end: '2017-08' }],
    highlights: ['Authored technical content on programming topics, primarily Python.'],
  },
]
