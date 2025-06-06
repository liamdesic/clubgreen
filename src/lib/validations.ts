import { z } from 'zod';
import type { Tables } from './database.types';
import type { ScoreTimeRange } from './types';

// Event validation
export const eventSchema = z.object({
  title: z.string().min(1, 'Title is required').trim(),
  short_code: z.string().length(6, 'Short code must be 6 characters'),
  access_uuid: z.string().uuid('Invalid UUID format'),
  organization_id: z.string().uuid('Invalid organization ID').nullable(),
  event_date: z.string().datetime().nullable(),
  published: z.boolean().nullable(),
  settings_json: z.record(z.unknown()).nullable()
});

// Scorecard validation
export const scorecardSchema = z.object({
  name: z.string().min(1, 'Name is required').trim(),
  score: z.number().int().min(0, 'Score must be positive'),
  hole_number: z.number().int().min(1).max(18).nullable(),
  hole_in_ones: z.number().int().min(0).nullable(),
  tiebreaker_rank: z.number().int().min(1).nullable(),
  published: z.boolean().nullable(),
  event_id: z.string().uuid('Invalid event ID').nullable(),
  player_id: z.string().uuid('Invalid player ID').nullable()
});

// Organization validation
export const organizationSchema = z.object({
  name: z.string().min(1, 'Name is required').trim(),
  slug: z.string().min(1, 'Slug is required').trim(),
  org_leaderboard_codes: z.record(z.unknown()),
  settings_json: z.record(z.unknown()).nullable(),
  payment_up_to_date: z.boolean(),
  subscription_status: z.string().nullable(),
  stripe_customer_id: z.string().nullable(),
  stripe_subscription_id: z.string().nullable(),
  current_period_end: z.string().nullable(),
  trial_ends_at: z.string().nullable(),
  owner_id: z.string().uuid('Invalid owner ID').nullable()
});

// Event settings validation
export const eventSettingsSchema = z.object({
  accent_color: z.string().nullable().optional(),
  score_time_range: z.enum(['all_time', 'today', 'this_week', 'this_month', 'this_year']).optional(),
  hole_count: z.number().int().min(1).max(18).nullable().optional(),
  show_hole_in_ones: z.boolean().nullable().optional(),
  show_ads: z.boolean().nullable().optional(),
  ad_image_url: z.string().nullable().optional(),
  ad_link: z.string().nullable().optional(),
  show_leaderboard: z.boolean().nullable().optional(),
  show_scorecard: z.boolean().nullable().optional(),
  show_leaderboard_ads: z.boolean().nullable().optional(),
  ads_image_url: z.string().nullable().optional(),
  archived: z.boolean().nullable().optional(),
  scorecard_ad_text: z.string().nullable().optional(),
  scorecard_ad_url: z.string().nullable().optional(),
  show_on_main_leaderboard: z.boolean().nullable().optional(),
  event_type: z.enum(['single', 'recurring']).nullable().optional()
});

// Organization settings validation
export const organizationSettingsSchema = z.object({
  logo_url: z.string().nullable().optional(),
  accent_color: z.string().nullable().optional(),
  ad_image_url: z.string().nullable().optional(),
  ad_link: z.string().nullable().optional(),
  billing_email: z.string().email('Invalid email format').nullable().optional(),
  color_palette: z.array(z.string()).nullable().optional()
});

// Helper function to validate event data
export function validateEvent(data: unknown) {
  return eventSchema.safeParse(data);
}

// Helper function to validate scorecard data
export function validateScorecard(data: unknown) {
  return scorecardSchema.safeParse(data);
}

// Helper function to validate organization data
export function validateOrganization(data: unknown) {
  return organizationSchema.safeParse(data);
}

// Helper function to validate event settings
export function validateEventSettings(data: unknown) {
  return eventSettingsSchema.safeParse(data);
}

// Helper function to validate organization settings
export function validateOrganizationSettings(data: unknown) {
  return organizationSettingsSchema.safeParse(data);
}
