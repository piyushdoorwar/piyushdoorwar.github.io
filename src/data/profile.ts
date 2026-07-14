import type { IconType } from 'react-icons'
import {
  FaGithub,
  FaLinkedin,
  FaXTwitter,
  FaInstagram,
  FaMedium,
  FaSpotify,
  FaYoutube,
  FaApple,
  FaAmazon,
  FaEnvelope,
} from 'react-icons/fa6'

export interface SocialLink {
  label: string
  href: string
  icon: IconType
}

export interface SkillGroup {
  title:
    | 'Programming languages'
    | 'Frameworks & Libraries'
    | 'Cloud & Databases'
    | 'Software & Tools'
  items: string[]
}

export interface Profile {
  name: string
  handle: string
  headline: string
  location: string
  /** Short one-liner shown in the terminal hero. */
  tagline: string
  /** Longer bio paragraphs for the About section. */
  about: string[]
  /** Skills shown as grouped tags in the About section. */
  skillGroups: SkillGroup[]
  email: string
  resumeUrl: string // TODO: drop resume.pdf in /public and keep this path
  socials: SocialLink[]
}

export const profile: Profile = {
  name: 'Piyush Doorwar',
  handle: 'piyushdoorwar',
  headline: 'Backend Engineer · Builder',
  location: 'Mumbai, India',
  tagline: "I build backend systems that don't just ship — they hold up.",
  about: [
    "I'm a backend engineer with 8+ years of experience designing systems that stay reliable under real-world load. I care about clean architecture, correctness, and shipping things people actually use.",
    'Outside of my day job I build tools I wish existed — desktop apps, browser and editor extensions, and small utilities. I also write about the things I learn, explore music through Proto Elyon, and publish books.',
  ],
  skillGroups: [
    {
      title: 'Programming languages',
      items: ['C#', 'Python', 'TypeScript', 'JavaScript'],
    },
    {
      title: 'Frameworks & Libraries',
      items: ['.NET 10', 'ASP.NET Core', 'Entity Framework Core', 'Node.js', 'React', 'Minimal APIs'],
    },
    {
      title: 'Cloud & Databases',
      items: [
        'Microsoft Azure',
        'Azure DevOps',
        'AWS',
        'Google Cloud',
        'Microsoft SQL Server',
        'PostgreSQL',
        'Redis',
        'MongoDB',
        'Couchbase',
      ],
    },
    {
      title: 'Software & Tools',
      items: [
        'Apache Kafka',
        'Docker',
        'Git',
        'GitHub Actions',
        'CI/CD',
        'System Design',
        'REST APIs',
        'GraphQL',
        'Microservices',
        'Domain-Driven Design',
        'CQRS',
        'Event-Driven Architecture',
        'Design Patterns',
        'Observability',
        'New Relic',
        'Datadog',
        'Postman',
        'Jira',
        'Apache JMeter',
      ],
    },
  ],
  email: 'piyushdoorwar+github@gmail.com',
  resumeUrl: '/resume.pdf',
  socials: [
    { label: 'GitHub', href: 'https://github.com/piyushdoorwar', icon: FaGithub },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/piyushdoorwar/', icon: FaLinkedin },
    { label: 'X', href: 'https://x.com/piyush_doorwar', icon: FaXTwitter },
    { label: 'Instagram', href: 'https://instagram.com/piyushdoorwar', icon: FaInstagram },
    { label: 'Medium', href: 'https://medium.com/@piyushdoorwar', icon: FaMedium },
    {
      label: 'Spotify',
      href: 'https://open.spotify.com/artist/2Gqifc7jbZ0VaAaWZyQiZU',
      icon: FaSpotify,
    },
    {
      label: 'YouTube Music',
      href: 'https://music.youtube.com/channel/UC0OBfty5j3A5fnBjTH3jqPQ',
      icon: FaYoutube,
    },
    {
      label: 'Apple Music',
      href: 'https://music.apple.com/us/artist/proto-elyon/1895799126',
      icon: FaApple,
    },
    {
      label: 'Amazon Music',
      href: 'https://music.amazon.in/artists/B0GYGK3GYC/proto-elyon',
      icon: FaAmazon,
    },
    { label: 'Email', href: 'mailto:piyushdoorwar+github@gmail.com', icon: FaEnvelope },
  ],
}
