// This file defines the matcher for the [org] parameter
// It ensures that only routes under the [org] directory use this validation

export function match(param: string) {
  // Only validate org parameter if the route is under /[org]/
  // This allows other routes like /login and /dashboard to work without validation
  
  // Check if the parameter contains only alphanumeric characters, underscores, and hyphens
  // This matches the actual validation used in the application for organization slugs
  return /^[a-zA-Z0-9_-]+$/.test(param);
}
