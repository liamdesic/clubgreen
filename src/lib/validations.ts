import { z } from 'zod';
import type { Database } from './database.types';

// Custom Zod type for date fields that can handle both Date objects and ISO strings
// but always converts to ISO string to match database types
const dateSchema = z.union([
  z.string().datetime(),
  z.date().transform(d => d.toISOString())
]);

// Custom Zod type for nullable date fields
const nullableDateSchema = z.union([
  z.string().datetime().nullish(),
  z.date().transform(d => d.toISOString()).nullish()
]).transform(val => val ?? null);

// Re-export database types for convenience
export type { Database };

// --- Schema Definitions ---

// --- Utility Functions ---

/**
 * Convert a value to a Date if it's a valid date string
 */
function toDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }
  return null;
}

/**
 * Convert a value to an ISO string if it's a Date or date string
 */
function toISOString(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') {
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date.toISOString();
  }
  return null;
}

/**
 * Parse a JSON field with a given schema, handling both string and object inputs
 */
function parseJSONField<T>(value: unknown, schema: z.ZodType<T>): T | null {
  if (value == null) return null;
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return schema.parse(parsed);
  } catch {
    return null;
  }
}

// --- EventSettings ---
/**
 * EventSettings: shape of events.settings_json
 * Only include flexible settings not promoted to real columns.
 */
export const eventSettingsSchema = z.object({
  // Add only truly flexible/experimental settings here
}).nullable().default({});

export type EventSettings = z.infer<typeof eventSettingsSchema>;

// --- OrganizationSettings ---
/**
 * OrganizationSettings: shape of organizations.settings_json
 * Only include flexible settings not promoted to real columns.
 */
export const organizationSettingsSchema = z.object({
  // Add only truly flexible/experimental settings here
}).nullable().default({});

export type OrganizationSettings = z.infer<typeof organizationSettingsSchema>;

// --- TimeFilter ---
/**
 * Canonical TimeFilter type. Only these values are valid for time-based filtering.
 */
export const timeFilterSchema = z.enum([
  'last_hour',
  'last_day',
  'last_week',
  'last_month',
  'all_time',
  'since_start_of_hour',
  'since_start_of_day',
  'since_start_of_month'
]);

export type TimeFilter = z.infer<typeof timeFilterSchema>;

// --- Event ---
/**
 * Canonical Event type: every column in events table is strongly typed here.
 * Always import Event from this file. Never define event types elsewhere.
 */
export const eventSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1, 'Title is required'),
  access_uuid: z.string().uuid('Invalid access UUID'),
  short_code: z.string().regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers, and hyphens allowed'),
  organization_id: z.string().uuid('Invalid organization ID').nullable(),
  created_at: nullableDateSchema,
  updated_at: nullableDateSchema,
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
  settings: eventSettingsSchema.nullable().default({}),
});

export type Event = z.infer<typeof eventSchema>;

// Normalize a raw DB event row into a canonical Event
export function normalizeEvent(raw: any): Event {
  return {
    ...raw,
    time_filters: parseJSONField(raw.time_filters, z.array(timeFilterSchema)) ?? null,
    settings: parseJSONField(raw.settings, eventSettingsSchema) ?? {}
  };
}

// --- Organization ---
/**
 * Canonical Organization type: every column in organizations table is strongly typed here.
 * Always import Organization from this file. Never define organization types elsewhere.
 */
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
  org_leaderboard_codes: z.any().transform(val => {
    try {
      return typeof val === 'string' ? JSON.parse(val) : val;
    } catch {
      return null;
    }
  }).nullable(),
  payment_up_to_date: z.boolean().default(false),
  stripe_customer_id: z.string().nullable(),
  stripe_subscription_id: z.string().nullable(),
  subscription_status: z.string().nullable(),
  current_period_end: nullableDateSchema,
  trial_ends_at: nullableDateSchema,
  settings: organizationSettingsSchema.nullable().default({}),
});

export type Organization = z.infer<typeof organizationSchema>;

// --- Scorecard ---
/**
 * Canonical Scorecard type: every column in scorecard table is strongly typed here.
 * Always import Scorecard from this file. Never define scorecard types elsewhere.
 */
export const scorecardSchema = z.object({
  id: z.string().uuid().optional(),
  created_at: nullableDateSchema,
  updated_at: nullableDateSchema,
  published: z.boolean().default(false).nullable(),
  name: z.string().min(1, 'Name is required'),
  event_id: z.string().uuid('Invalid event ID').nullable(),
  player_id: z.string().uuid('Invalid player ID').nullable(),
  game_id: z.string().uuid('Invalid game ID').nullable(),
  hole_number: z.number().int().positive('Must be a positive number').nullable(),
  score: z.number().int('Must be an integer'),
  hole_in_ones: z.number().int().min(0, 'Cannot be negative').nullable(),
  tiebreaker_rank: z.number().int().min(0, 'Cannot be negative').nullable(),
});

export type Scorecard = z.infer<typeof scorecardSchema>;

// --- PlayerScore ---
/**
 * App-level type for leaderboard display
 */
export const playerScoreSchema = z.object({
  id: z.string(),
  name: z.string(),
  totalScore: z.number(),
  holeInOnes: z.number(),
});

export type PlayerScore = z.infer<typeof playerScoreSchema>;

// --- EventLog ---
/**
 * Canonical EventLog type: every column in event_logs table is strongly typed here.
 */
export const eventLogSchema = z.object({
  id: z.string(),
  event_type: z.string(),
  org_id: z.string().nullable(),
  created_at: z.string().nullable(),
  context: z.unknown().nullable(),
});

export type EventLog = z.infer<typeof eventLogSchema>;

// Organization form validation for onboarding/editing
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

// Standard form error response type
export type FormErrorResponse<T = Record<string, unknown>> = {
  values: Partial<T>;
  errors: {
    [key: string]: string[] | undefined;
  };
  message?: string;
};

// --- Generic Validator ---
/**
 * Generic validator function that can validate any data against a Zod schema
 * @example
 * const result = validate(eventSchema, someData);
 * if (result.success) {
 *   // TypeScript knows result.data is an Event
 *   const event: Event = result.data;
 * }
 */
export function validate<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown
): z.SafeParseReturnType<z.infer<T>, z.infer<T>> {
  return schema.safeParse(data);
}

// Convenience validators for common types
export const validateEvent = (data: unknown) => validate(eventSchema, data);
export const validateOrganization = (data: unknown) => validate(organizationSchema, data);
export const validateScorecard = (data: unknown) => validate(scorecardSchema, data);
export const validateEventSettings = (data: unknown) => validate(eventSettingsSchema, data);
export const validateOrganizationSettings = (data: unknown) => validate(organizationSettingsSchema, data);
