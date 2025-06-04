import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

// This is a very simple page load function
// Most of the work happens in +page.server.ts
export const load: PageLoad = async () => {
  // Nothing to do here - auth handling is done server-side
  return {
    // You can add any additional data needed for a loading state if desired
    status: 'processing'
  };
};
