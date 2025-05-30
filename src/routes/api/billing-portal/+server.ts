import { json, error } from '@sveltejs/kit';
import { stripe } from '$lib/server/stripe/client';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
  try {
    // Get the authenticated user from locals
    const { user } = await locals.getSession();
    
    if (!user) {
      throw error(401, 'Unauthorized - Please log in');
    }

    // Get the organization for the user
    const { data: organization, error: orgError } = await locals.supabase
      .from('organizations')
      .select('id, stripe_customer_id')
      .eq('owner_id', user.id)
      .single();

    if (orgError || !organization) {
      console.error('Error fetching organization:', orgError);
      throw error(404, 'Organization not found');
    }

    if (!organization.stripe_customer_id) {
      throw error(404, 'No subscription found for this organization');
    }

    // Create billing portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: organization.stripe_customer_id,
      return_url: `${url.origin}/dashboard/account`,
    });

    if (!portalSession.url) {
      throw new Error('Failed to create billing portal session');
    }

    return json({ url: portalSession.url });
    
  } catch (err) {
    console.error('Billing portal error:', err);
    throw error(500, {
      message: err instanceof Error ? err.message : 'Internal server error'
    });
  }
};
