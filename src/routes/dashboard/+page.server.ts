import { redirect } from '@sveltejs/kit';
import { getSecureSession } from '$lib/supabaseClient';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const { session, user } = await getSecureSession();
  
  if (!session || !user) {
    throw redirect(303, '/login');
  }
  
  return {
    session,
    user
  };
};
