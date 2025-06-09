import { z } from 'zod';

export const organizationFormSchema = z.object({
  name: z
    .string()
    .min(2, { message: 'Organization name must be at least 2 characters' })
    .max(50, { message: 'Organization name must be less than 50 characters' })
    .trim(),
  slug: z
    .string()
    .min(2, { message: 'URL must be at least 2 characters' })
    .max(30, { message: 'URL must be less than 30 characters' })
    .regex(/^[a-z0-9-]+$/, { 
      message: 'URL can only contain lowercase letters, numbers, and hyphens' 
    })
    .transform(val => val.toLowerCase().trim()),
  logoUrl: z.string().url({ message: 'Please enter a valid URL' }).optional().or(z.literal(''))
});

export type OrganizationFormData = z.infer<typeof organizationFormSchema>;
