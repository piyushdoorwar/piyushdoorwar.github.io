export interface Certification {
  name: string
  provider: string
  issued: string
  credentialId: string
  credentialUrl?: string
  /** Optional local certificate artwork. Generated preview is used when omitted. */
  previewImage?: string
  skills: string[]
}

export const certifications: Certification[] = [
  {
    name: 'Claude 101',
    provider: 'Anthropic',
    issued: 'Jun 2026',
    credentialId: 'ducdkyej8dii',
    credentialUrl: 'https://verify.skilljar.com/c/ducdkyej8dii',
    skills: ['Claude'],
  },
  {
    name: 'AI Capabilities and Limitations',
    provider: 'Anthropic',
    issued: 'Jun 2026',
    credentialId: 'a9uk3gtokwv5',
    credentialUrl: 'https://verify.skilljar.com/c/a9uk3gtokwv5',
    skills: ['AI Fundamentals'],
  },
  {
    name: 'New Relic Verified Foundation (NVF)',
    provider: 'New Relic',
    issued: 'Nov 2025',
    credentialId: '166547868',
    credentialUrl: 'https://credentials.newrelic.com/bb04475f-237d-434e-b670-02c42b70211e',
    skills: ['New Relic', 'Observability'],
  },
  {
    name: 'ASP.NET Core web app',
    provider: 'Microsoft',
    issued: 'Sep 2024',
    credentialId: '3C6C05040946173F',
    credentialUrl:
      'https://learn.microsoft.com/en-us/users/piyushdoorwar/credentials/3c6c05040946173f',
    skills: ['ASP.NET Core'],
  },
  {
    name: 'Software Engineer',
    provider: 'HackerRank',
    issued: 'Sep 2024',
    credentialId: '34375e3b1386',
    credentialUrl: 'https://www.hackerrank.com/certificates/34375e3b1386',
    skills: [],
  },
  {
    name: 'New Relic Observability Foundations Badge',
    provider: 'New Relic',
    issued: 'Sep 2024',
    credentialId: '114529205',
    credentialUrl: 'https://credentials.newrelic.com/5aac95d3-66c3-4b83-8f75-ded678650d39',
    skills: ['New Relic', 'Observability'],
  },
  {
    name: 'Confluent Fundamentals Accreditation',
    provider: 'Confluent',
    issued: 'Sep 2024',
    credentialId: '114393203',
    credentialUrl: 'https://certificates.confluent.io/3fcf43b6-817b-4139-9d5d-030271c7946a#acc.LARB8yjw',
    skills: ['Apache Kafka'],
  },
  {
    name: 'SQL',
    provider: 'HackerRank',
    issued: 'Jun 2023',
    credentialId: '013B33AC396B',
    credentialUrl: 'https://www.hackerrank.com/certificates/013b33ac396b',
    skills: ['Microsoft SQL Server', 'PostgreSQL'],
  },
  {
    name: 'C#',
    provider: 'HackerRank',
    issued: 'Jun 2023',
    credentialId: '207B2C18ADBB',
    credentialUrl: 'https://www.hackerrank.com/certificates/207b2c18adbb',
    skills: ['C#'],
  },
  {
    name: 'Problem Solving',
    provider: 'HackerRank',
    issued: 'Dec 2023',
    credentialId: '8A99E44B070F',
    credentialUrl: 'https://www.hackerrank.com/certificates/8a99e44b070f',
    skills: [],
  },
  {
    name: 'Rest API',
    provider: 'HackerRank',
    issued: 'Apr 2023',
    credentialId: 'D1FD83BBCBB0',
    credentialUrl: 'https://www.hackerrank.com/certificates/d1fd83bbcbb0',
    skills: ['REST APIs'],
  },
  {
    name: 'Intro To PostgreSQL Databases',
    provider: 'Udemy',
    issued: 'Mar 2023',
    credentialId: 'UC-db2377ac-a97b-464e-8857-a4b71e3b8fee',
    credentialUrl:
      'https://www.udemy.com/certificate/UC-db2377ac-a97b-464e-8857-a4b71e3b8fee/',
    skills: ['PostgreSQL'],
  },
  {
    name: 'C# Advanced Topics',
    provider: 'Udemy',
    issued: 'Apr 2022',
    credentialId: 'UC-9e30ccef-0ccd-4190-876e-9170a0f29e3d',
    credentialUrl:
      'https://www.udemy.com/certificate/UC-9e30ccef-0ccd-4190-876e-9170a0f29e3d/',
    skills: ['C#'],
  },
  {
    name: 'Apache Kafka Series - Beginners v2',
    provider: 'Udemy',
    issued: 'Jan 2022',
    credentialId: 'UC-ca89c6c0-2aff-4ac4-b74f-950593f5fcdb',
    credentialUrl:
      'https://www.udemy.com/certificate/UC-ca89c6c0-2aff-4ac4-b74f-950593f5fcdb/',
    skills: ['Apache Kafka'],
  },
  {
    name: 'Docker for the Absolute Beginner',
    provider: 'Udemy',
    issued: 'Jan 2022',
    credentialId: 'UC-3b469879-f663-482d-9ae6-e45a159e8b05',
    credentialUrl:
      'https://www.udemy.com/certificate/UC-3b469879-f663-482d-9ae6-e45a159e8b05/',
    skills: ['Docker'],
  },
  {
    name: 'Software Architecture: Domain-Driven Design',
    provider: 'LinkedIn',
    issued: 'Oct 2021',
    credentialId: 'N/A',
    credentialUrl:
      'https://www.linkedin.com/learning/certificates/f151e10342c5250cd2735cf6595d6791e596c34589c7932e70dbbda11f459e5d',
    skills: ['Domain-Driven Design'],
  },
  {
    name: 'Applying Asynchronous Programming',
    provider: 'Pluralsight',
    issued: 'Aug 2021',
    credentialId: '4127',
    skills: [],
  },
  {
    name: 'Getting Started with Apache Kafka',
    provider: 'Pluralsight',
    issued: 'Aug 2021',
    credentialId: '4127',
    skills: ['Apache Kafka'],
  },
  {
    name: 'NoSQL Essential Training',
    provider: 'LinkedIn',
    issued: 'Aug 2021',
    credentialId: 'N/A',
    credentialUrl:
      'https://www.linkedin.com/learning/certificates/2eee00564a7192eab438fcdaae7f5eb55d48aa96fafa4cdc8180069bc449581a/',
    skills: [],
  },
  {
    name: 'Advanced Design Patterns',
    provider: 'LinkedIn',
    issued: 'Jun 2021',
    credentialId: 'N/A',
    credentialUrl:
      'https://www.linkedin.com/learning/certificates/391682066f3a071466e36128f25129653792702a5f3bfdfbc0df8c51403f3ccf/',
    skills: ['Design Patterns'],
  },
  {
    name: 'Google Cloud Certified',
    provider: 'Google',
    issued: 'May 2021',
    credentialId: '0JWihR',
    skills: ['Google Cloud'],
  },
  {
    name: 'Microsoft Certified: Azure Fundamentals',
    provider: 'Microsoft',
    issued: 'Mar 2021',
    credentialId: 'H734-4619',
    credentialUrl: 'https://www.credly.com/badges/a941e93b-9d55-468c-aeac-5bf3260a81fb',
    skills: ['Microsoft Azure'],
  },
  {
    name: 'Python',
    provider: 'HackerRank',
    issued: 'Oct 2020',
    credentialId: 'FF8BC57BECAF',
    credentialUrl: 'https://www.hackerrank.com/certificates/ff8bc57becaf',
    skills: ['Python'],
  },
]

export function getCertificationsForSkill(skill: string) {
  return certifications.filter((certification) => certification.skills.includes(skill))
}
