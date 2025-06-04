/**
 * Server-side utility functions
 */

/**
 * Parse a combined code string into shortcode and UUID components
 * Format: shortcode-uuid or shortcode+uuid
 * 
 * @param code The combined code string to parse
 * @returns Object with code and uuid properties, or null if invalid format
 */
export function parseCodeAndUUID(code: string): { code: string; uuid: string } | null {
  if (!code) return null;
  
  // Check if the code contains a UUID (which should be 36 characters)
  // Format can be shortcode-uuid or shortcode+uuid
  const uuidRegex = /^(.+)[-+]([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;
  const match = code.match(uuidRegex);
  
  if (match) {
    return {
      code: match[1],
      uuid: match[2]
    };
  }
  
  return null;
}

/**
 * Validate if a string is a valid shortcode format
 * 
 * @param code The shortcode to validate
 * @returns boolean indicating if the code is valid
 */
export function isValidShortCode(code: string): boolean {
  if (!code) return false;
  
  // Shortcode should be alphanumeric and at least 3 characters
  return /^[a-z0-9]{3,}$/i.test(code);
}

/**
 * Validate if a string is a valid UUID format
 * 
 * @param uuid The UUID to validate
 * @returns boolean indicating if the UUID is valid
 */
export function isValidAccessUUID(uuid: string): boolean {
  if (!uuid) return false;
  
  // UUID format: 8-4-4-4-12 hexadecimal characters
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);
}
