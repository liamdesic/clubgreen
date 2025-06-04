import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	const user = await locals.getUser();
	if (!user) throw redirect(303, '/login');

	const { data: org } = await locals.supabase
		.from('organizations')
		.select('stripe_customer_id')
		.eq('owner_id', user.id)
		.maybeSingle();

	if (!org || !org.stripe_customer_id) {
		throw redirect(303, '/onboarding');
	}

	return {
		user,
		org
	};
};
