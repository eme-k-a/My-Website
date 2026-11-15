// Normalized content for all client code (ARCHITECTURE §3.1, §3.9).
import { normalize } from './normalize';
import { resume } from './resume';
import type { Content } from './types';

export const content: Content = normalize(resume);
