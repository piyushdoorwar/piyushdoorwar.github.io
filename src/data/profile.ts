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
  email: string
  resumeUrl: string // TODO: drop resume.pdf in /public and keep this path
  socials: SocialLink[]
}

export const profile: Profile = {
  name: 'Piyush Doorwar',
  handle: 'piyushdoorwar',
  headline: 'Backend Engineer · Builder',
  location: 'Mumbai, India',
  company: 'StudyIn',
  tagline: "I build backend systems that don't just ship — they hold up.",
  about: [
    "I'm a backend engineer with 8+ years of experience designing systems that stay reliable under real-world load. I care about clean architecture, correctness, and shipping things people actually use.",
    'Outside of my day job I build tools I wish existed — desktop apps, browser and editor extensions, and small utilities. I also write about the things I learn, explore music through Proto Elyon, and publish books.',
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
  email: 'piyushdoorwar+github@gmail.com',
  resumeUrl: '/resume.pdf',
  socials: [
    { label: 'GitHub', href: 'https://github.com/piyushdoorwar', icon: FaGithub },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/piyushdoorwar/', icon: FaLinkedin },
    { label: 'X', href: 'https://x.com/piyushdoorwar', icon: FaXTwitter }, // TODO: confirm handle
    { label: 'Instagram', href: 'https://instagram.com/piyushdoorwar', icon: FaInstagram }, // TODO
    { label: 'Medium', href: 'https://medium.com/@piyushdoorwar', icon: FaMedium }, // TODO: confirm
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
