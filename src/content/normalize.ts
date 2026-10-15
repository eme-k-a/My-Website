// Hand-written defaults equal to the zod defaults (ARCHITECTURE §3.4), so the client gets normalized
// content without shipping zod. A unit test asserts normalize(resume) deep-equals Resume.parse(resume).
import type { z } from 'zod';
import type {
  Bullet,
  Certifications,
  Copy,
  Education,
  Exhibit,
  Location,
  Project,
  StoryBlock,
  Volunteer,
  Work,
} from './schema';
import type { Content, ResumeInput } from './types';

type In<T extends z.ZodType> = z.input<T>;
type Out<T extends z.ZodType> = z.output<T>;

const copy = (c: In<typeof Copy>): Out<typeof Copy> => ({ ...c, draft: c.draft ?? false });

const location = (l: In<typeof Location>): Out<typeof Location> => ({
  ...l,
  mode: l.mode ?? 'on-site',
});

const bullet = (b: In<typeof Bullet>): Out<typeof Bullet> => ({
  ...b,
  print: b.print ?? true,
  priority: b.priority ?? 2,
  draft: b.draft ?? false,
});

const storyBlock = (s: In<typeof StoryBlock>): Out<typeof StoryBlock> => ({
  ...s,
  draft: s.draft ?? false,
});

function exhibit(e: In<typeof Exhibit>): Out<typeof Exhibit> {
  const { curatorNote, takeaway, ...rest } = e;
  return {
    ...rest,
    story: e.story.map(storyBlock),
    object: copy(e.object),
    ...(curatorNote !== undefined && { curatorNote: copy(curatorNote) }),
    ...(takeaway !== undefined && { takeaway: copy(takeaway) }),
    tags: e.tags ?? [],
    links: e.links ?? [],
    draft: e.draft ?? false,
  };
}

const work = (w: In<typeof Work>): Out<typeof Work> => ({
  ...w,
  location: location(w.location),
  bullets: w.bullets.map(bullet),
  exhibit: exhibit(w.exhibit),
});

const project = (p: In<typeof Project>): Out<typeof Project> => ({
  ...p,
  bullets: p.bullets.map(bullet),
  exhibit: exhibit(p.exhibit),
});

const volunteer = (v: In<typeof Volunteer>): Out<typeof Volunteer> => ({
  ...v,
  location: location(v.location),
  bullets: v.bullets.map(bullet),
  exhibit: exhibit(v.exhibit),
});

const education = (e: In<typeof Education>): Out<typeof Education> => ({
  ...e,
  location: location(e.location),
  exhibit: exhibit(e.exhibit),
});

const certifications = (c: In<typeof Certifications>): Out<typeof Certifications> => ({
  ...c,
  exhibit: exhibit(c.exhibit),
});

export function normalize(r: ResumeInput): Content {
  return {
    ...r,
    gallery: {
      ...r.gallery,
      lobby: { ...r.gallery.lobby, intro: copy(r.gallery.lobby.intro) },
      desk: { ...r.gallery.desk, body: copy(r.gallery.desk.body) },
    },
    experiences: r.experiences.map(work),
    projects: r.projects.map(project),
    volunteer: r.volunteer.map(volunteer),
    education: r.education.map(education),
    certifications: certifications(r.certifications),
  };
}
