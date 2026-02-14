import { z } from 'zod';

export const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  siteRole: z.string().optional(),
  lastLogin: z.string().optional(),
  externalAuthUserId: z.string().optional(),
  authSetting: z.string().optional(),
});

export type User = z.infer<typeof userSchema>;
