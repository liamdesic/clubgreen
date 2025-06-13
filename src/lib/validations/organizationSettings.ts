import { z } from 'zod';

export const leaderboardRotationIntervalSchema = z
  .string()
  .regex(/^(\d+)([sm])$/, {
    message: 'Rotation interval must be in format "10s" or "1m"'
  })
  .transform((val) => {
    const match = val.match(/^(\d+)([sm])$/);
    if (!match) return '10s'; // Default to 10 seconds if invalid
    return val;
  });

export const organizationSettingsSchema = z.object({
  leaderboard_rotation_interval: leaderboardRotationIntervalSchema,
  color_palette: z.record(z.string()).optional(),
  ads_image_url: z.string().url().optional().or(z.literal('')),
  ads_text: z.string().optional(),
  ads_url: z.string().url().optional().or(z.literal('')),
});

export type OrganizationSettings = z.infer<typeof organizationSettingsSchema>; 