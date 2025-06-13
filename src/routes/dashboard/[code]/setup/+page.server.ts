import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, parent }) => {
  // Get data from parent layout
  const { org, events } = await parent();

  // Find the event in the events array from layout
  const event = events.find(e => e.short_code === params.code);

  if (!event) {
    throw error(404, 'Event not found');
  }

  return {
    event,
    org // Return the organization data from parent layout
  };
}; 