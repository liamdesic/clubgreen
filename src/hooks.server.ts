// src/hooks.server.ts
import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import type { Handle } from '@sveltejs/kit';
import { redirect, type RequestEvent } from '@sveltejs/kit';
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

  return resolve(event, {
    filterSerializedResponseHeaders(name) {
      return name === 'content-range' || name === 'x-supabase-api-version';
    },
  });
};

// Route protection handler
const authGuard: Handle = async ({ event, resolve }) => {
  // Get the user for this request
  const user = await event.locals.getUser();
  
  // Store user in locals for easy access
  event.locals.user = user;
  
  // Protected routes logic
  const path = event.url.pathname;
  
  // We don't need to protect dashboard routes here anymore
  // That's now handled by /dashboard/+layout.server.ts
  
  // Redirect authenticated users away from auth pages
  if ((path === '/login') && user) {
    throw redirect(303, '/dashboard');
  }

  return resolve(event);
};

// Combine handlers using sequence
export const handle: Handle = sequence(supabaseHandler, authGuard);