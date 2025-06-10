import { z } from 'zod';
import type { Database } from './database.types';
import { parseJSONField } from './utils/jsonUtils';
import { dateSchema, nullableDateSchema } from './validations/dateSchemas';
import { timeFilterSchema, type TimeFilter } from './validations/timeFilter';
import { type FormErrorResponse } from './validations/errorSchemas';

// Core schema definitions - these map directly to Supabase tables
// Keep these in this file as they are fundamental to the application

export const eventSettingsSchema = z.object({
  // Add only truly flexible/experimental settings here
}).nullable().default({});

export type EventSettings = z.infer<typeof eventSettingsSchema>;

export const organizationSettingsSchema = z.object({
  // Add only truly flexible/experimental settings here
}).nullable().default({});

export type OrganizationSettings = z.infer<typeof organizationSettingsSchema>;

// Event schema - maps to events table
export const eventSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1, 'Title is required'),
  access_uuid: z.string().uuid('Invalid access UUID'),
  short_code: z.string().regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers, and hyphens allowed'),
  organization_id: z.string().uuid('Invalid organization ID').nullable(),
  created_at: nullableDateSchema,
  event_date: nullableDateSchema,
  accent_color: z.string().regex(/^#[0-9a-f]{6}$/i, 'Must be a valid hex color').nullable(),
  logo_url: z.string().url('Invalid URL').nullable(),
  hole_count: z.number().int().positive('Must be a positive number').nullable(),
  show_on_main_leaderboard: z.boolean().default(false).nullable(),
  archived: z.boolean().default(false).nullable(),
  published: z.boolean().default(false).nullable(),
  ads_text: z.string().nullable(),
  ads_url: z.string().url('Invalid URL').nullable(),
  ads_image_url: z.string().url('Invalid URL').nullable(),
  time_filters: z.array(timeFilterSchema).nullable(),
  settings_json: z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.record(z.any()),
    z.array(z.any())
  ]).nullable().default(null)
});

export type Event = z.infer<typeof eventSchema>;

// Normalize a raw DB event row into a canonical Event
export function normalizeEvent(raw: any): Event {
  return {
    ...raw,
    time_filters: parseJSONField(raw.time_filters, z.array(timeFilterSchema)) ?? null,
    settings_json: parseJSONField(raw.settings_json, z.any()) ?? null
  };
}

// Organization schema - maps to organizations table
export const organizationSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Name is required'),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers, and hyphens allowed'),
  owner_id: z.string().uuid('Invalid owner ID').nullable(),
  created_at: nullableDateSchema,
  updated_at: nullableDateSchema,
  logo_url: z.string().url('Invalid URL').nullable(),
  ads_image_url: z.string().url('Invalid URL').nullable(),
  billing_email: z.string().email('Invalid email').nullable(),
  color_palette: z.string().regex(/^#[0-9a-f]{6}(,#[0-9a-f]{6})*$/i, 'Must be a valid color palette').nullable(),
  org_leaderboard_codes: z.any()
    .transform(val => {
      try {
        return typeof val === 'string' ? JSON.parse(val) : val;
      } catch {
        return [];
      }
    })
    .default([]),
  leaderboard_rotation_interval: z.enum(['5s', '10s', '15s', '30s', '60s']).default('10s'),
  payment_up_to_date: z.boolean().default(false),
  stripe_customer_id: z.string().nullable(),
  stripe_subscription_id: z.string().nullable(),
  subscription_status: z.string().nullable(),
  current_period_end: nullableDateSchema,
  trial_ends_at: nullableDateSchema,
  settings: organizationSettingsSchema.nullable().default({}),
});

export type Organization = z.infer<typeof organizationSchema>;

// Database types
type Tables = Database['public']['Tables'];
type ScorecardRow = Tables['scorecard']['Row']; // Used for type inference

// Scorecard schema - maps to scorecard table
// Base schema with all fields and their validation rules
const baseScorecardSchema = {
  id: z.string().uuid().optional(),
  created_at: z.string().datetime().nullable(),
  updated_at: z.string().datetime().nullable(), // Changed from nullish to nullable for DB consistency
  name: z.string().min(1, 'Name is required'),
  score: z.number().int('Score must be an integer').min(0, 'Score cannot be negative'),
  published: z.boolean().default(false).nullable(),
  event_id: z.string().uuid('Invalid event ID').nullable(),
  player_id: z.string().uuid('Invalid player ID').nullable(),
  game_id: z.string().uuid('Invalid game ID').nullable(),
  hole_number: z.number().int().positive('Must be a positive number').nullable(),
  hole_in_ones: z.number().int().min(0, 'Cannot be negative').nullable(),
  tiebreaker_rank: z.number().int().min(0, 'Cannot be negative').nullable(),
};

// Converts database row to application Scorecard type, handling any necessary transformations
export function fromScorecardRow(row: unknown): Scorecard | null {
  const result = scorecardSchema.safeParse(row);
  if (!result.success) {
    console.warn('Invalid scorecard row:', row, result.error);
    return null;
  }
  
  const data = result.data;
  
  // Apply any transformations needed for the application
  return {
    ...data,
    // Add any additional transformations here
    // Example: dateField: data.dateField ? new Date(data.dateField) : null
  };
}

export const scorecardSchema = z.object({
  ...baseScorecardSchema,
  // Required fields for complete records
  id: baseScorecardSchema.id.unwrap(),
  name: baseScorecardSchema.name,
  score: baseScorecardSchema.score,
}).transform(data => ({
  ...data,
  // Ensure consistent null handling
  created_at: data.created_at ?? null,
  updated_at: data.updated_at ?? null,
  published: data.published ?? false,
  event_id: data.event_id ?? null,
  player_id: data.player_id ?? null,
  game_id: data.game_id ?? null,
  hole_number: data.hole_number ?? null,
  hole_in_ones: data.hole_in_ones ?? null,
  tiebreaker_rank: data.tiebreaker_rank ?? null,
}));

// Schema for creating new scorecards (excludes auto-generated fields)
export const scorecardInsertSchema = z.object({
  name: baseScorecardSchema.name,
  score: baseScorecardSchema.score,
  published: baseScorecardSchema.published,
  event_id: baseScorecardSchema.event_id,
  player_id: baseScorecardSchema.player_id,
  game_id: baseScorecardSchema.game_id,
  hole_number: baseScorecardSchema.hole_number,
  hole_in_ones: baseScorecardSchema.hole_in_ones,
  tiebreaker_rank: baseScorecardSchema.tiebreaker_rank,
});

// Schema for updating scorecards (all fields optional except id)
export const scorecardUpdateSchema = z.object({
  id: baseScorecardSchema.id.unwrap(),
  name: baseScorecardSchema.name.optional(),
  score: baseScorecardSchema.score.optional(),
  published: baseScorecardSchema.published.optional(),
  event_id: baseScorecardSchema.event_id.optional(),
  player_id: baseScorecardSchema.player_id.optional(),
  game_id: baseScorecardSchema.game_id.optional(),
  hole_number: baseScorecardSchema.hole_number.optional(),
  hole_in_ones: baseScorecardSchema.hole_in_ones.optional(),
  tiebreaker_rank: baseScorecardSchema.tiebreaker_rank.optional(),
});

export type Scorecard = z.infer<typeof scorecardSchema>;
export type ScorecardInsert = Omit<Scorecard, 'id' | 'created_at' | 'updated_at'>;
export type ScorecardUpdate = Partial<Omit<Scorecard, 'id' | 'created_at' | 'updated_at'>>;


// EventLog schema - maps to event_logs table
export const eventLogSchema = z.object({
  id: z.string(),
  event_type: z.string(),
  org_id: z.string().nullable(),
  created_at: z.string().nullable(),
  context: z.unknown().nullable(),
});

export type EventLog = z.infer<typeof eventLogSchema>;

// LeaderboardSnapshot schema - maps to leaderboard_snapshot table
export const leaderboardSnapshotSchema = z.object({
  id: z.string().uuid().optional(),
  event_id: z.string().uuid('Invalid event ID'),
  scores: z.record(z.any()).or(z.array(z.any())),
  time_filter: z.string().optional(),
  created_at: z.string().datetime().nullable(),
  updated_at: z.string().datetime().nullable(),
  last_updated: z.string().datetime().nullable(),
});

export type LeaderboardSnapshot = z.infer<typeof leaderboardSnapshotSchema>;

export const leaderboardSnapshotInsertSchema = leaderboardSnapshotSchema.pick({
  event_id: true,
  scores: true,
  time_filter: true,
});

export type LeaderboardSnapshotInsert = z.infer<typeof leaderboardSnapshotInsertSchema>;

export const leaderboardSnapshotUpdateSchema = leaderboardSnapshotSchema.partial().required({
  id: true,
});

export type LeaderboardSnapshotUpdate = z.infer<typeof leaderboardSnapshotUpdateSchema>;
