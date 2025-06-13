// src/hooks.server.ts
import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';

// Create the Supabase client handler
const supabaseHandler: Handle = async ({ event, resolve }) => {
  const supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      get: (key) => event.cookies.get(key),
      set: (key, value, options) => event.cookies.set(key, value, { ...options, path: '/' }),
      remove: (key, options) => event.cookies.delete(key, { ...options, path: '/' }),
    },
  });

  event.locals.supabase = supabase;
  
  // Secure method to get the authenticated user
  event.locals.getUser = async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error) return null;
    return data.user;
  };

  return resolve(event);
};

// Route protection handler
const authGuard: Handle = async ({ event, resolve }) => {
  const user = await event.locals.getUser();
  event.locals.user = user;
  
  // Store session in locals for access across pages
  const { data: { session } } = await event.locals.supabase.auth.getSession();
  event.locals.session = session;
  
  // Only redirect from login if we have a valid user session
  if (event.url.pathname === '/login' && user && session && !event.url.searchParams.get('error')) {
    // Check if user has completed onboarding
    const { data: org } = await event.locals.supabase
      .from('organizations')
      .select('id, stripe_customer_id')
      .eq('owner_id', user.id)
      .maybeSingle();
    
    const hasCompletedOnboarding = org && org.stripe_customer_id;
    
    if (hasCompletedOnboarding) {
      throw redirect(303, '/dashboard');
    } else {
      throw redirect(303, '/onboarding');
    }
  }

  return resolve(event);
};

// Combine handlers using sequence
export const handle: Handle = sequence(supabaseHandler, authGuard);