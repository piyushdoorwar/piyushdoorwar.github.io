import type { IconType } from 'react-icons'
import {
  FaGithub,
  FaLinkedin,
  FaXTwitter,
  FaInstagram,
  FaMedium,
  FaSpotify,
  FaYoutube,
  FaEnvelope,
} from 'react-icons/fa6'

export interface SocialLink {
  label: string
  href: string
  icon: IconType
}

export interface Profile {
  name: string
  handle: string
  headline: string
  location: string
  company: string
  /** Short one-liner shown in the terminal hero. */
  tagline: string
  /** Longer bio paragraphs for the About section. */
  about: string[]
  /** Tech / tools shown as tags. */
  stack: string[]
  /** GitHub username used by the build-time stats fetcher for follower count. */
  githubUser: string
  email: string
  resumeUrl: string // TODO: drop resume.pdf in /public and keep this path
  socials: SocialLink[]
}

export const profile: Profile = {
  name: 'Piyush Doorwar',
  handle: 'piyushdoorwar',
  headline: 'Backend Engineer · Builder · Musician',
  location: 'Mumbai, India',
  company: 'StudyIn',
  tagline: "I build backend systems that don't just ship — they hold up.",
  about: [
    "I'm a backend engineer with 8+ years of experience designing systems that stay reliable under real-world load. I care about clean architecture, correctness, and shipping things people actually use.",
    'Outside of my day job I build tools I wish existed — desktop apps, browser and editor extensions, and small utilities. I also write about the things I learn, make music, and publish books.',
  ],
  stack: [
    'C# / .NET',
    'Node.js',
    'TypeScript',
    'React',
    'Apache Kafka',
    'Microservices',
    'MongoDB',
    'Couchbase',
    'Docker',
    'Google Cloud',
    'Azure',
    'CI/CD',
  ],
  githubUser: 'piyushdoorwar',
  email: 'piyushd@gostudyin.com',
  resumeUrl: '/resume.pdf',
  socials: [
    { label: 'GitHub', href: 'https://github.com/piyushdoorwar', icon: FaGithub },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/piyushdoorwar/', icon: FaLinkedin },
    { label: 'X', href: 'https://x.com/piyushdoorwar', icon: FaXTwitter }, // TODO: confirm handle
    { label: 'Instagram', href: 'https://instagram.com/piyushdoorwar', icon: FaInstagram }, // TODO
    { label: 'Medium', href: 'https://medium.com/@piyushdoorwar', icon: FaMedium }, // TODO: confirm
    { label: 'Spotify', href: '#', icon: FaSpotify }, // TODO: add Spotify artist URL
    { label: 'YouTube Music', href: '#', icon: FaYoutube }, // TODO: add YT Music URL
    { label: 'Email', href: 'mailto:piyushd@gostudyin.com', icon: FaEnvelope },
  ],
}
