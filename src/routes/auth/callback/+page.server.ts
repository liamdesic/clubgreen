import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, locals }) => {
	const code = url.searchParams.get('code');
	const redirectTo = url.searchParams.get('redirectTo') || '/dashboard';

	// 1. Ensure the magic link code is present
	if (!code) {
		throw redirect(303, `/login?error=${encodeURIComponent('Missing code')}&redirectTo=${encodeURIComponent(redirectTo)}`);
	}

	// 2. Exchange the code for a session
	const { error: exchangeError } = await locals.supabase.auth.exchangeCodeForSession(code);

	if (exchangeError) {
		console.error('❌ [auth/callback] Code exchange failed:', exchangeError.message);
		throw redirect(303, `/login?error=${encodeURIComponent('Invalid or expired link')}&redirectTo=${encodeURIComponent(redirectTo)}`);
	}

	// 3. Get the user from the session
	const user = await locals.getUser();
	if (!user) {
		throw redirect(303, `/login?error=${encodeURIComponent('User not found after login')}&redirectTo=${encodeURIComponent(redirectTo)}`);
	}

	// 4. Check if onboarding is complete
	const { data: org, error: orgError } = await locals.supabase
		.from('organizations')
		.select('id, stripe_customer_id')
		.eq('owner_id', user.id)
		.maybeSingle();

	if (orgError) {
		console.error('❌ [auth/callback] Error loading organization:', orgError.message);
		throw redirect(303, `/login?error=${encodeURIComponent('Failed to load organization')}&redirectTo=${encodeURIComponent(redirectTo)}`);
	}

	const onboarded = org && org.stripe_customer_id;

	// 5. Redirect based on onboarding state
	if (!onboarded) {
		throw redirect(303, `/onboarding?redirectTo=${encodeURIComponent(redirectTo)}`);
	}

	throw redirect(303, redirectTo);
};
