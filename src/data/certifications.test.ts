import { describe, expect, it } from 'vitest'
import { certifications, getCertificationsForSkill } from './certifications'
import { profile } from './profile'

describe('getCertificationsForSkill', () => {
  it('returns every certification listing that skill', () => {
    const claude = getCertificationsForSkill('Claude')
    expect(claude.length).toBeGreaterThan(0)
    for (const certification of claude) expect(certification.skills).toContain('Claude')
  })

  it('returns nothing for an unknown skill', () => {
    expect(getCertificationsForSkill('COBOL')).toEqual([])
  })

  it('matches exactly, not loosely', () => {
    // A substring must not pull in unrelated credentials.
    expect(getCertificationsForSkill('Clau')).toEqual([])
    expect(getCertificationsForSkill('')).toEqual([])
  })

  it('is case-sensitive, matching the skill labels as written', () => {
    expect(getCertificationsForSkill('claude')).toEqual([])
  })
})

/**
 * Credentials that list no skill at all. Nothing in the About stack can open them,
 * so they are inert data. Recorded rather than asserted away: the list should only
 * ever shrink, and the test below fails if it does, prompting this to be trimmed.
 */
const CREDENTIALS_WITHOUT_SKILLS = [
  'Software Engineer',
  'Problem Solving',
  'Applying Asynchronous Programming',
  'NoSQL Essential Training',
]

/** Two Pluralsight entries share what looks like a placeholder credential id. */
const KNOWN_DUPLICATE_CREDENTIAL_IDS = ['4127']

describe('certification data integrity', () => {
  it('gives every credential the fields the modal renders', () => {
    for (const certification of certifications) {
      expect(certification.name.length, certification.credentialId).toBeGreaterThan(0)
      expect(certification.provider.length, certification.name).toBeGreaterThan(0)
      expect(certification.issued.length, certification.name).toBeGreaterThan(0)
      expect(certification.credentialId.length, certification.name).toBeGreaterThan(0)
    }
  })

  it('only links verifiable credentials over https', () => {
    for (const certification of certifications) {
      if (!certification.credentialUrl) continue
      expect(certification.credentialUrl, certification.name).toMatch(/^https:\/\//)
    }
  })

  it('gives every credential a skill, apart from the recorded gaps', () => {
    const missing = certifications
      .filter((certification) => certification.skills.length === 0)
      .map((certification) => certification.name)

    expect(missing.sort()).toEqual([...CREDENTIALS_WITHOUT_SKILLS].sort())
  })

  it('has no duplicate credential ids, apart from the recorded ones', () => {
    const seen = new Set<string>()
    const duplicates = new Set<string>()
    for (const { credentialId } of certifications) {
      if (seen.has(credentialId)) duplicates.add(credentialId)
      seen.add(credentialId)
    }

    expect([...duplicates].sort()).toEqual([...KNOWN_DUPLICATE_CREDENTIAL_IDS].sort())
  })

  it('points local preview artwork at a root-relative path', () => {
    for (const certification of certifications) {
      if (!certification.previewImage) continue
      expect(certification.previewImage, certification.name).toMatch(/^\//)
    }
  })

  it('only claims skills that appear in the About stack, so the badge is reachable', () => {
    // A certification tied to a skill nobody lists is a badge no one can ever open.
    const listedSkills = new Set(profile.skillGroups.flatMap((group) => group.items))
    const orphaned = certifications
      .flatMap((certification) => certification.skills)
      .filter((skill) => !listedSkills.has(skill))

    expect([...new Set(orphaned)]).toEqual([])
  })

  it('is reachable from About for every credential that lists a skill', () => {
    for (const certification of certifications) {
      if (certification.skills.length === 0) continue
      const reachable = certification.skills.some((skill) =>
        getCertificationsForSkill(skill).includes(certification),
      )
      expect(reachable, certification.name).toBe(true)
    }
  })
})
