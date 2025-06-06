import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	const user = await locals.getUser();
	if (!user) throw redirect(303, '/login');

	const { data: org } = await locals.supabase
		.from('organizations')
		.select('id, name, slug, stripe_customer_id, stripe_subscription_id, subscription_status, current_period_end, trial_ends_at, settings_json, payment_up_to_date, org_leaderboard_codes')
		.eq('owner_id', user.id)
		.maybeSingle();

	if (!org || !org.stripe_customer_id) {
		throw redirect(303, '/onboarding');
	}

	// Fetch all events for this organization
	const { data: events } = await locals.supabase
		.from('events')
		.select('*')
		.eq('organization_id', org.id)
		.order('created_at', { ascending: false });

	return {
		user,
		org, // Keep the original org for compatibility
		organizations: org ? [org] : [], // Add organizations array for dashboard page
		events: events || [] // Add events array for dashboard page
	};
};
