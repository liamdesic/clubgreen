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

// Performance optimization handler
const performanceHandler: Handle = async ({ event, resolve }) => {
  const response = await resolve(event);
  
  // Add performance headers for all responses
  response.headers.set('Cache-Control', 'public, max-age=300'); // 5 minutes cache
  
  // Special handling for leaderboard pages
  if (event.url.pathname.includes('/ob/')) {
    // Add preload headers for critical resources
    const linkHeaders = [
      // Critical CSS for black background - must be first
      '</leaderboard-preload.css>; rel="preload"; as="style"; fetchpriority="high"',
      
      // Preconnect to external domains
      '<https://cdnjs.cloudflare.com>; rel="preconnect"; crossorigin',
      '<https://use.typekit.net>; rel="preconnect"; crossorigin',
      '<https://p.typekit.net>; rel="preconnect"; crossorigin',
      
      // DNS prefetch for performance
      '<https://cdnjs.cloudflare.com>; rel="dns-prefetch"',
      '<https://use.typekit.net>; rel="dns-prefetch"',
      '<https://p.typekit.net>; rel="dns-prefetch"',
      
      // Preload critical fonts to avoid FOIT (Flash of Invisible Text)
      '<https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/webfonts/fa-solid-900.woff2>; rel="preload"; as="font"; type="font/woff2"; crossorigin',
      
      // Preload our stylesheet - these are already imported in the component
      '</fontawesome-subset.css>; rel="preload"; as="style"'
    ];
    
    response.headers.set('Link', linkHeaders.join(', '));
    
    // Set font-display optimization
    response.headers.set('Font-Display', 'swap');
  }
  
  return response;
};

// Combine handlers using sequence
export const handle: Handle = sequence(supabaseHandler, authGuard, performanceHandler);