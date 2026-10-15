// Content skeleton (WP-02). Structural facts are real (PLAN §1, docs/CONTENT_DRAFT.md, ARCHITECTURE
// §3.8); every bullet, caption, story, object and skills line is a placeholder that WP-03 fills in
// from docs/CONTENT_DRAFT.md. The phone number is never written here: `contact` is strict.
import { SITE_URL } from './site';
import type { ResumeInput } from './types';

const TODO = '[placeholder: filled in WP-03 from docs/CONTENT_DRAFT.md]';
const todoCopy = () => ({ text: TODO, draft: true });
const todoBullets = () => [{ text: '[placeholder: bullet, WP-03]', draft: true }];
const todoExhibit = (title: string) => ({
  title,
  caption: TODO,
  story: [{ type: 'p' as const, text: TODO, draft: true }],
  object: todoCopy(),
});

export const resume = {
  meta: {
    siteUrl: SITE_URL,
    title: TODO,
    description: TODO,
    lang: 'en-CA',
  },
  contact: {
    name: 'Chukwuemeka Nduka-Nwagbo',
    preferredName: 'Emeka',
    email: 'cndukanwagbo@mun.ca',
    linkedin: 'https://linkedin.com/in/emekanduka',
    github: 'https://github.com/eme-k-a',
    location: "St. John's, NL",
    phoneInPublicPdf: false,
  },
  gallery: {
    title: 'Commit History',
    lobby: { eyebrow: TODO, headline: TODO, intro: todoCopy(), hint: TODO },
    desk: { headline: TODO, body: todoCopy(), footnote: TODO },
  },
  experiences: [
    {
      id: 'verafin',
      kind: 'work',
      role: 'Software Development Co-op Student',
      shortRole: 'Software Development Co-op',
      org: 'Nasdaq Verafin',
      employment: 'co-op',
      location: { city: "St. John's", region: 'NL', mode: 'on-site' },
      dates: { start: '2026-09', end: '2026-12' },
      tense: 'present',
      bullets: todoBullets(),
      // PLAN Addendum (R0 rulings after WP-00): Verafin starts as a draft exhibit.
      exhibit: { ...todoExhibit('The Reporting Engine'), draft: true },
    },
    {
      id: 'mysa',
      kind: 'work',
      role: 'Full Stack Software Developer (Co-op)',
      org: 'Mysa',
      employment: 'co-op',
      location: { city: "St. John's", region: 'NL' },
      dates: { start: '2026-01', end: '2026-05' },
      tense: 'past',
      bullets: todoBullets(),
      exhibit: todoExhibit('Warm Start'),
    },
    {
      id: 'wailo',
      kind: 'work',
      role: 'Front End Developer (Co-op)',
      org: 'Wailo',
      employment: 'co-op',
      location: { city: 'Calgary', region: 'AB', mode: 'remote' },
      dates: { start: '2025-05', end: '2025-08' },
      tense: 'past',
      bullets: todoBullets(),
      exhibit: todoExhibit('The Deep Link'),
    },
    {
      id: 'cfia',
      kind: 'work',
      role: 'IT Support Technician (Intern)',
      org: 'Canadian Food Inspection Agency',
      employment: 'internship',
      location: { city: 'Ottawa', region: 'ON', mode: 'remote' },
      dates: { start: '2022-12', end: '2024-08' },
      tense: 'past',
      bullets: todoBullets(),
      exhibit: todoExhibit('The Ticket Spindle'),
    },
  ],
  projects: [
    {
      id: 'klarup',
      kind: 'project',
      name: 'KlarUp',
      tagline: 'Collaborative Productivity App',
      stack: ['React Native', 'Python', 'Expo'],
      bullets: todoBullets(),
      exhibit: todoExhibit('The Climb'),
    },
    {
      id: 'finance-tracker',
      kind: 'project',
      name: 'Personal Finance Tracker',
      tagline: '[placeholder: tagline, WP-03]',
      stack: ['MongoDB', 'Express', 'React', 'Node.js'],
      bullets: todoBullets(),
      exhibit: todoExhibit('The Balance'),
    },
  ],
  volunteer: [
    {
      id: 'safe-sip',
      kind: 'volunteer',
      role: 'Member (Right-To-Rise: Safe Sip)',
      org: 'Enactus Memorial',
      location: { city: "St. John's", region: 'NL' },
      dates: { start: '2025-09', end: 'present' },
      tense: 'present',
      bullets: todoBullets(),
      exhibit: todoExhibit('Tamper Evident'),
    },
    {
      id: 'sdsj',
      kind: 'volunteer',
      role: 'President',
      org: "Software Developers of St. John's",
      location: { city: "St. John's", region: 'NL' },
      dates: { start: '2024-07', end: 'present' },
      tense: 'present',
      bullets: todoBullets(),
      exhibit: todoExhibit('The Round Table'),
    },
  ],
  education: [
    {
      id: 'mun',
      kind: 'education',
      institution: 'Memorial University of Newfoundland',
      degree: 'B.Eng in Computer Engineering',
      shortInstitution: 'MUN',
      shortDegree: 'B.Eng Computer Engineering',
      location: { city: "St. John's", region: 'NL' },
      graduation: '2027-05',
      exhibit: todoExhibit('Work in Progress'),
    },
  ],
  certifications: {
    id: 'certifications',
    kind: 'certifications',
    items: [
      { name: 'AWS Certified Cloud Practitioner' },
      { name: 'Tech Stewardship Practice Program' },
      { name: 'Tech Stewardship for the Energy Transition' },
    ],
    exhibit: todoExhibit('The Medal Cabinet'),
  },
  skills: [{ label: TODO, items: [TODO] }],
  wings: [
    {
      id: 'projects',
      title: 'Projects',
      after: 'verafin',
      side: 'left',
      items: ['klarup', 'finance-tracker'],
    },
    {
      id: 'volunteer',
      title: 'Volunteer & Leadership',
      after: 'mysa',
      side: 'right',
      items: ['safe-sip', 'sdsj'],
    },
  ],
} satisfies ResumeInput;
