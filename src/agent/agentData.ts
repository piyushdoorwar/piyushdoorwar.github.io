import { certifications } from '../data/certifications'
import { experiences } from '../data/experience'
import { artistName, musicBlurb, musicLinks } from '../data/music'
import { profile } from '../data/profile'
import { projects } from '../data/projects'
import { stats } from '../data/stats'
import { traffic } from '../data/traffic'
import { articles, books, medium } from '../data/writing'

export const SITE_URL = 'https://piyushdoorwar.com'
export const MCP_ENDPOINT = 'https://mcp.piyushdoorwar.com/mcp'
/** Published path of the snapshot the MCP server reads. */
export const AGENT_DATA_PATH = '/agent/data.json'

/**
 * Plain-JSON snapshot of the portfolio for agents. The MCP server answers every tool
 * from this one file, so the site, `llms-full.txt` and the tools cannot disagree.
 * Bump `version` when the shape changes in a way the server must know about.
 */
export function buildAgentData() {
  return {
    version: 1,
    site: SITE_URL,
    generatedAt: new Date().toISOString(),
    profile: {
      name: profile.name,
      handle: profile.handle,
      headline: profile.headline,
      location: profile.location,
      tagline: profile.tagline,
      about: profile.about,
      skills: profile.skillGroups.map(({ title, items }) => ({ group: title, items })),
      email: profile.email,
      links: profile.socials
        .filter((social) => social.href.startsWith('http'))
        .map(({ label, href }) => ({ label, url: href })),
    },
    experience: experiences.map((entry) => ({
      company: entry.company,
      location: entry.location ?? null,
      workMode: entry.workMode ?? null,
      employmentType: entry.employmentType ?? null,
      positions: entry.positions,
      highlights: entry.highlights,
      award: entry.award ?? null,
    })),
    projects: projects.map((project) => ({
      id: project.id,
      name: project.name,
      kind: project.kind,
      tagline: project.tagline,
      description: project.description,
      tags: project.tags,
      featured: project.featured ?? false,
      website: project.website,
      github: project.stats?.githubRepo ? `https://github.com/${project.stats.githubRepo}` : null,
      vscodeMarketplace: project.stats?.vscodeExtension
        ? `https://marketplace.visualstudio.com/items?itemName=${project.stats.vscodeExtension}`
        : null,
    })),
    books: books.map((book) => ({
      title: book.title,
      subtitle: book.subtitle ?? null,
      url: book.href,
      series: book.collection ?? null,
    })),
    articles: articles.map((article) => ({
      title: article.title,
      subtitle: article.subtitle,
      url: article.url,
      publishedAt: article.publishedAt,
      tags: article.tags,
      readingTimeMin: article.readingTimeMin,
      claps: medium.hasEngagement ? article.claps : null,
    })),
    certifications: certifications.map((certification) => ({
      name: certification.name,
      provider: certification.provider,
      issued: certification.issued,
      url: certification.credentialUrl ?? null,
      skills: certification.skills,
    })),
    music: {
      artist: artistName,
      about: musicBlurb,
      links: musicLinks.map(({ label, href }) => ({ label, url: href })),
    },
    stats: {
      updatedAt: stats.generatedAt,
      githubStars: stats.totals.stars,
      vscodeInstalls: stats.totals.installs,
      releaseDownloads: stats.totals.downloads,
      siteVisits: traffic.totals.visits,
      visitorCountries: traffic.countries.length,
      trafficSince: traffic.periodStart.slice(0, 10),
    },
  }
}

export type AgentData = ReturnType<typeof buildAgentData>

function formatMonth(value: string) {
  const [year, month] = value.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1)).toLocaleString('en-US', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

/** The whole snapshot as one Markdown document, for agents that read files instead of tools. */
export function renderLlmsFull(data: AgentData) {
  const { profile: me } = data
  const lines: string[] = [
    `# ${me.name}`,
    '',
    `> ${me.headline} based in ${me.location}. ${me.tagline}`,
    '',
    `Site: ${data.site}/ · MCP endpoint: ${MCP_ENDPOINT} · JSON: ${data.site}${AGENT_DATA_PATH}`,
    '',
    '## About',
    '',
    ...me.about.flatMap((paragraph) => [paragraph, '']),
    '## Skills',
    '',
    ...me.skills.map(({ group, items }) => `- ${group}: ${items.join(', ')}`),
    '',
    '## Experience',
    '',
  ]

  for (const entry of data.experience) {
    const where = [entry.location, entry.workMode, entry.employmentType].filter(Boolean).join(' · ')
    lines.push(`### ${entry.company}${where ? ` (${where})` : ''}`, '')
    for (const position of entry.positions) {
      const end = position.end ? formatMonth(position.end) : 'Present'
      lines.push(`- ${position.role}: ${formatMonth(position.start)} – ${end}`)
    }
    lines.push('', ...entry.highlights.map((highlight) => `- ${highlight}`))
    if (entry.award) lines.push(`- Recognition: ${entry.award}`)
    lines.push('')
  }

  lines.push('## Projects', '')
  for (const project of data.projects) {
    lines.push(
      `### ${project.name}`,
      '',
      `${project.kind}. ${project.tagline} ${project.description}`,
      '',
      `- Website: ${project.website}`,
    )
    if (project.github) lines.push(`- Source: ${project.github}`)
    if (project.vscodeMarketplace) lines.push(`- VS Code Marketplace: ${project.vscodeMarketplace}`)
    lines.push(`- Tags: ${project.tags.join(', ')}`, '')
  }

  lines.push('## Books', '')
  for (const book of data.books) {
    lines.push(`- [${book.title}](${book.url})${book.subtitle ? `: ${book.subtitle}` : ''}`)
  }

  lines.push('', '## Articles on Medium', '')
  for (const article of data.articles) {
    const date = article.publishedAt ? ` (${article.publishedAt.slice(0, 10)})` : ''
    lines.push(`- [${article.title}](${article.url})${date}${article.subtitle ? `: ${article.subtitle}` : ''}`)
  }

  lines.push('', '## Certifications', '')
  for (const certification of data.certifications) {
    const label = `${certification.name} (${certification.provider}, ${certification.issued})`
    lines.push(certification.url ? `- [${label}](${certification.url})` : `- ${label}`)
  }

  lines.push(
    '',
    `## Music as ${data.music.artist}`,
    '',
    data.music.about,
    '',
    ...data.music.links.map(({ label, url }) => `- [${label}](${url})`),
    '',
    '## Contact',
    '',
    `- Email: ${me.email}`,
    ...me.links.map(({ label, url }) => `- [${label}](${url})`),
    '',
  )

  return lines.join('\n')
}
