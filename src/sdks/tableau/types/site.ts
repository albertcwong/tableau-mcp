import { z } from 'zod';

export const siteSchema = z.object({
  id: z.string(),
  name: z.string(),
  contentUrl: z.string().optional(),
});

export type Site = z.infer<typeof siteSchema>;
