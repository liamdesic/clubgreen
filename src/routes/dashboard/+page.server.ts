import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, locals }) => {
  console.log('🔍 [dashboard] Starting dashboard load...');
  // 1. Get the current session and verify the user
  const { data: { session }, error: sessionError } = await locals.supabase.auth.getSession();
  
  if (sessionError || !session) {
    console.error('❌ [dashboard] Session error or no session:', sessionError?.message);
    const redirectTo = url.pathname === '/dashboard' ? '' : `?redirectTo=${encodeURIComponent(url.pathname)}`;
    throw redirect(303, `/login${redirectTo}`);
  }
  
  // Verify the user with a fresh call to getUser
  const { data: { user }, error: userError } = await locals.supabase.auth.getUser(session.access_token);
  
  if (userError || !user) {
    console.error('❌ [dashboard] User verification failed:', userError?.message);
    const redirectTo = url.pathname === '/dashboard' ? '' : `?redirectTo=${encodeURIComponent(url.pathname)}`;
    throw redirect(303, `/login${redirectTo}`);
  }
  
  console.log('🔑 [dashboard] User authenticated and verified:', { 
    userId: user.id, 
    email: user.email 
  });
  
  // Update the session with the verified user
  locals.user = user;
  locals.session = session;

  // 3. Get user's organizations
  console.log('🔍 [dashboard] Fetching organizations for user:', user.id);
  const { data: organizations, error: orgError } = await locals.supabase
    .from('organizations')
    .select('*')
    .eq('owner_id', user.id);

  // 4. If error fetching orgs, log error and return empty arrays
  if (orgError) {
    console.error('❌ [dashboard] Error fetching organizations:', orgError);
    return {
      organizations: [],
      user,
      events: []
    };
  }
  
  console.log(`✅ [dashboard] Found ${organizations?.length || 0} organizations`);
  if (organizations && organizations.length > 0) {
    console.log('📝 [dashboard] First organization:', {
      id: organizations[0].id,
      name: organizations[0].name,
      owner_id: organizations[0].owner_id
    });
  }

  // 5. Redirect to onboarding if user has NO organization
  if (!organizations || organizations.length === 0) {
    console.log('ℹ️ [dashboard] No organizations found, redirecting to onboarding');
    throw redirect(303, '/onboarding');
  }

  // 6. Get events for the first organization
  let events: any[] = [];
  const orgId = organizations[0]?.id;
  
  console.log('🔍 [dashboard] Fetching events for organization:', orgId);

  if (orgId) {
    const { data: orgEvents, error: eventsError } = await locals.supabase
      .from('events')
      .select('*')
      .eq('organization_id', orgId)
      .order('event_date', { ascending: false });

    if (!eventsError) {
      events = orgEvents || [];
      console.log(`✅ [dashboard] Found ${events.length} events for organization ${orgId}`);
    } else {
      console.error('❌ [dashboard] Error fetching events:', eventsError);
    }
  }

  // 7. Return all data with proper typing
  return {
    organizations: organizations.map(org => ({
      id: org.id,
      name: org.name,
      slug: org.slug,
      trial_ends_at: org.trial_ends_at || null,
      settings_json: org.settings_json || {}
    })),
    user: {
      id: user.id,
      email: user.email,
      // Add other user fields as needed
    },
    events: events.map(event => ({
      id: event.id,
      title: event.title,
      slug: event.slug,
      event_date: event.event_date,
      organization_id: event.organization_id,
      settings_json: event.settings_json || {}
    }))
  };
};
