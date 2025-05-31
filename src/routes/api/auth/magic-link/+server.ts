import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import type { RequestHandler } from './$types';

// Create a Supabase client on the server side
const createSupabaseServer = () => {
  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

  console.log('Server: Supabase URL available:', !!supabaseUrl);
  console.log('Server: Supabase Anon Key available:', !!supabaseAnonKey);
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Server: Missing Supabase environment variables');
    console.error('Server: Make sure your .env file is properly set up with PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY');
  }
  
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: false,
      detectSessionInUrl: false
    }
  });
};

export const POST: RequestHandler = async ({ request, url }) => {
  console.log('🔑 [AUTH] Starting magic link request processing');
  console.log('🌐 Request URL:', url.toString());
  
  try {
    // Parse the request body
    const body = await request.json();
    const { email } = body;
    
    console.log('📧 [AUTH] Parsed request body:', { email: email ? '*****' + email.substring(5) : 'none' });
    
    if (!email) {
      console.error('❌ [AUTH] No email provided in request');
      return json({ success: false, error: 'Email is required' }, { status: 400 });
    }

    console.log('🔗 [AUTH] Processing magic link request for:', email);
    
    // Get the redirect URL from the client
    const clientRedirectTo = url.searchParams.get('redirectTo');
    console.log('🔄 [AUTH] Client redirect URL:', clientRedirectTo || 'none');

    // Detect if running locally or in production
    const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    const redirectBase = isLocal
      ? 'http://localhost:5173'
      : 'https://www.ldrboard.co';
    
    console.log('🌍 [AUTH] Environment:', isLocal ? 'Local' : 'Production');
    console.log('🏠 [AUTH] Using base URL:', redirectBase);
    
    // The magic link itself should redirect back to the /login page for token processing.
    let emailVerificationRedirect = `${redirectBase}/login`;
    console.log('🔗 [AUTH] Email verification redirect URL:', emailVerificationRedirect);
    if (clientRedirectTo) {
      emailVerificationRedirect += `?redirectTo=${encodeURIComponent(clientRedirectTo)}`;
    }
    
    console.log('Server: Email Verification Redirect URL (for magic link):', emailVerificationRedirect);
    if (clientRedirectTo) {
      console.log('Server: Final destination after login:', clientRedirectTo);
    }
    
    // Initialize Supabase on the server
    const supabase = createSupabaseServer();
    
    // Send the magic link
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: emailVerificationRedirect // Magic link sends user to /login with tokens
      }
    });
    
    if (error) {
      console.error('Server: Magic link error:', error);
      return json({ success: false, error: error.message }, { status: 500 });
    }
    
    console.log('Server: Magic link generated successfully');
    return json({ success: true, data });
    
  } catch (err) {
    console.error('Server: Exception in magic link generation:', err);
    return json({ 
      success: false, 
      error: err instanceof Error ? err.message : 'Unknown error' 
    }, { status: 500 });
  }
};
