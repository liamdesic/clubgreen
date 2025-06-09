import type { z } from 'zod';

/**
 * Standard form error response type for API responses
 * 
 * @template T - The type of the form values
 */
export type FormErrorResponse<T = Record<string, unknown>> = {
  /** The form values that were submitted */
  values: Partial<T>;
  /** Field-level validation errors */
  errors: {
    [key: string]: string[] | undefined;
  };
  /** Optional general error message */
  message?: string;
};

/**
 * Creates a type-safe error response object
 * 
 * @example
 * const error = createErrorResponse({
 *   values: { email: 'test@example' },
 *   errors: { email: ['Invalid email format'] }
 * });
 */
export function createErrorResponse<T = Record<string, unknown>>(
  error: FormErrorResponse<T>
): FormErrorResponse<T> {
  return error;
}

/**
 * Type guard to check if an object is a FormErrorResponse
 */
export function isFormErrorResponse(
  value: unknown
): value is FormErrorResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'values' in value &&
    'errors' in value &&
    typeof value.errors === 'object' &&
    value.errors !== null
  );
}

/**
 * Helper to create field-specific error messages
 */
export function fieldError(
  field: string,
  message: string
): Record<string, string[]> {
  return { [field]: [message] };
}
