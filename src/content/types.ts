// Type-only view of the content schema (ARCHITECTURE §3.1). Client code imports these types, never
// the zod schema itself, so zod never ships.
import type { z } from 'zod';
import type {
  Bullet as BulletSchema,
  Certification as CertificationSchema,
  Certifications as CertificationsSchema,
  Copy as CopySchema,
  DateRange as DateRangeSchema,
  Education as EducationSchema,
  Exhibit as ExhibitSchema,
  Link as LinkSchema,
  Location as LocationSchema,
  Project as ProjectSchema,
  Resume,
  SkillLine as SkillLineSchema,
  StoryBlock as StoryBlockSchema,
  Volunteer as VolunteerSchema,
  Wing as WingSchema,
  Work as WorkSchema,
} from './schema';

/** What `resume.ts` is written as (defaults may be omitted). */
export type ResumeInput = z.input<typeof Resume>;
/** Normalized content with every default applied; what the app reads. */
export type Content = z.output<typeof Resume>;

export type Work = z.output<typeof WorkSchema>;
export type Project = z.output<typeof ProjectSchema>;
export type Volunteer = z.output<typeof VolunteerSchema>;
export type Education = z.output<typeof EducationSchema>;
export type CertificationsBlock = z.output<typeof CertificationsSchema>;
export type Certification = z.output<typeof CertificationSchema>;
/** Any entry that has an exhibit (and an `/exhibit/<id>/` page). */
export type ExhibitEntry = Work | Project | Volunteer | Education | CertificationsBlock;

export type DateRange = z.output<typeof DateRangeSchema>;
export type Location = z.output<typeof LocationSchema>;
export type Exhibit = z.output<typeof ExhibitSchema>;
export type Copy = z.output<typeof CopySchema>;
export type Bullet = z.output<typeof BulletSchema>;
export type StoryBlock = z.output<typeof StoryBlockSchema>;
export type Link = z.output<typeof LinkSchema>;
export type Wing = z.output<typeof WingSchema>;
export type SkillLine = z.output<typeof SkillLineSchema>;
