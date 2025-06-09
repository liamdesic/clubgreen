import { z } from 'zod';
import { eventSchema, organizationSchema, scorecardSchema, eventSettingsSchema, organizationSettingsSchema } from '../validations';

/**
 * Validates data against a Zod schema
 * @example
 * const result = validate(eventSchema, someData);
 * if (result.success) {
 *   const event = result.data; // Type-safe
 * }
 */
export function validate<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown
): z.SafeParseReturnType<z.infer<T>, z.infer<T>> {
  return schema.safeParse(data);
}

// Convenience validators
export const validateEvent = (data: unknown) => validate(eventSchema, data);
export const validateOrganization = (data: unknown) => validate(organizationSchema, data);
export const validateScorecard = (data: unknown) => validate(scorecardSchema, data);
export const validateEventSettings = (data: unknown) => validate(eventSettingsSchema, data);
export const validateOrganizationSettings = (data: unknown) => validate(organizationSettingsSchema, data);
