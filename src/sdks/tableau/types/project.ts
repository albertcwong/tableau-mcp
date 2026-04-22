import { z } from 'zod';

export const projectSchema = z.object({
  name: z.string(),
  id: z.string(),
  parentProjectId: z.string().optional(),
  path: z.string().optional(),
});

export type Project = z.infer<typeof projectSchema>;
