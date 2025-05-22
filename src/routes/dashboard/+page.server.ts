import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { createClient } from '@supabase/supabase-js';

// Create a Supabase client on the server side
const createSupabaseServer = () => {
  // Try to access the environment variables from various places
  let supabaseUrl = '';
  let supabaseAnonKey = '';
  
  try {
    supabaseUrl = process.env.PUBLIC_SUPABASE_URL || 
                 import.meta.env.PUBLIC_SUPABASE_URL || 
                 import.meta.env.VITE_SUPABASE_URL || 
                 '';
                 
    supabaseAnonKey = process.env.PUBLIC_SUPABASE_ANON_KEY || 
                     import.meta.env.PUBLIC_SUPABASE_ANON_KEY || 
                     import.meta.env.VITE_SUPABASE_ANON_KEY || 
                     '';
  } catch (e) {
    console.error('Server: Error accessing environment variables:', e);
  }
  
  console.log('Server: Supabase URL available for auth check:', !!supabaseUrl);
  
  return createClient(supabaseUrl, supabaseAnonKey);
};

export const load: PageServerLoad = async ({ locals, url }) => {
  console.log('Server: Checking dashboard authentication');
  
  // Initialize Supabase on the server
  const supabase = createSupabaseServer();
  
  // Check if the user is authenticated
  const { data, error } = await supabase.auth.getSession();
  
  console.log('Server: Auth check result:', data?.session ? 'Authenticated' : 'Not authenticated');
  
  if (error || !data.session) {
    console.log('Server: Redirecting to login due to no session');
    // Redirect to login page if not authenticated
    throw redirect(303, `/login?redirectTo=${url.pathname}`);
  }
  
  // User is authenticated, continue to the page
  return {
    user: data.session.user
  };
};
