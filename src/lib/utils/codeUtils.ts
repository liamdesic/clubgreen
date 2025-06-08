// Unified code/UUID utility module for ldrboard
// All code/UUID generation, uniqueness, validation, and parsing logic is here.
// This is the single source of truth for code-related logic, used by both client and server.

import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);

/**
 * Generates a random alphanumeric short code of specified length
 * @param length - Length of the code to generate (default: 7)
 * @returns Random alphanumeric string in uppercase
 */
export function generateShortCode(length: number = 7): string {
  // Excludes ambiguous chars (0/O, 1/I)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generates a UUID v4 for secure access
 * @returns UUID v4 string
 */
export function generateAccessUUID(): string {
  return crypto.randomUUID();
}

/**
 * Checks if a short code already exists in the events table
 * @param code - The short code to check
 * @returns Boolean indicating if the code exists
 */
async function shortCodeExists(code: string): Promise<boolean> {
  const { data } = await supabase
    .from('events')
    .select('id')
    .eq('short_code', code)
    .limit(1);
  return Boolean(data && data.length > 0);
}

/**
 * Checks if a UUID already exists in the events table
 * @param uuid - The UUID to check
 * @returns Boolean indicating if the UUID exists
 */
async function accessUUIDExists(uuid: string): Promise<boolean> {
  const { data } = await supabase
    .from('events')
    .select('id')
    .eq('access_uuid', uuid)
    .limit(1);
  return Boolean(data && data.length > 0);
}

/**
 * Checks if an org leaderboard code already exists
 * @param code - The code to check
 * @returns Boolean indicating if the code exists
 */
async function orgLeaderboardCodeExists(code: string): Promise<boolean> {
  const { data } = await supabase
    .from('organizations')
    .select('id')
    .contains('org_leaderboard_codes', [{ code }])
    .limit(1);
  return Boolean(data && data.length > 0);
}

/**
 * Generates a unique short code that doesn't exist in the database
 * @param length - Length of the code to generate
 * @returns Promise resolving to a unique short code
 */
export async function generateUniqueShortCode(length: number = 7): Promise<string> {
  let code = generateShortCode(length);
  let attempts = 0;
  const maxAttempts = 10;
  while (await shortCodeExists(code)) {
    code = generateShortCode(length);
    attempts++;
    if (attempts >= maxAttempts) {
      throw new Error('Failed to generate a unique short code after multiple attempts');
    }
  }
  return code;
}

/**
 * Generates a unique access UUID that doesn't exist in the database
 * @returns Promise resolving to a unique UUID
 */
export async function generateUniqueAccessUUID(): Promise<string> {
  let uuid = generateAccessUUID();
  let attempts = 0;
  const maxAttempts = 10;
  while (await accessUUIDExists(uuid)) {
    uuid = generateAccessUUID();
    attempts++;
    if (attempts >= maxAttempts) {
      throw new Error('Failed to generate a unique UUID after multiple attempts');
    }
  }
  return uuid;
}

/**
 * Generates a unique org leaderboard code
 * @param length - Length of the code to generate
 * @returns Promise resolving to a unique org leaderboard code
 */
export async function generateUniqueOrgLeaderboardCode(length: number = 7): Promise<string> {
  let code = generateShortCode(length);
  let attempts = 0;
  const maxAttempts = 10;
  while (await orgLeaderboardCodeExists(code)) {
    code = generateShortCode(length);
    attempts++;
    if (attempts >= maxAttempts) {
      throw new Error('Failed to generate a unique org leaderboard code after multiple attempts');
    }
  }
  return code;
}

/**
 * Validates if a string matches the short code format
 * @param code - The code to validate
 * @returns Boolean indicating if the code is valid
 */
export function isValidShortCode(code: string): boolean {
  // Short code should be 6-8 uppercase alphanumeric characters (no ambiguous chars)
  return /^[A-HJ-NP-Z2-9]{6,8}$/.test(code);
}

/**
 * Validates if a string is a valid UUID
 * @param uuid - The UUID to validate
 * @returns Boolean indicating if the UUID is valid
 */
export function isValidAccessUUID(uuid: string): boolean {
  // UUID v4 format
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid);
}

/**
 * Parses a combined code-uuid string into its components
 * @param combined - The combined code-uuid string (e.g., "ABC123-uuid")
 * @returns Object with code and uuid properties, or null if invalid
 */
export function parseCodeAndUUID(combined: string): { code: string; uuid: string } | null {
  // Accepts 'SHORTCODE-UUID' or 'SHORTCODE+UUID'
  if (!combined) return null;
  const uuidRegex = /^([A-HJ-NP-Z2-9]{6,8})[-+]([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;
  const match = combined.match(uuidRegex);
  if (match) {
    const code = match[1];
    const uuid = match[2];
    if (isValidShortCode(code) && isValidAccessUUID(uuid)) {
      return { code, uuid };
    }
  }
  return null;
}
