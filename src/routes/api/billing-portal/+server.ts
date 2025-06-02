import { json, error } from '@sveltejs/kit';
import { stripe } from '$lib/server/stripe/client';
import type { RequestHandler } from './$types';
import type Stripe from 'stripe';
import { STRIPE_SECRET_KEY } from '$env/static/private';

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

    // Check if we're in test mode or live mode
    const isTestMode = STRIPE_SECRET_KEY.startsWith('sk_test_');
    
    // Create billing portal session
    try {
      // Create a billing portal session
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: organization.stripe_customer_id,
        return_url: `${url.origin}/dashboard/settings`,
      });

      if (!portalSession.url) {
        throw new Error('Failed to create billing portal session');
      }
      
      return json({ url: portalSession.url });
    } catch (stripeErr: unknown) {
      console.error('Stripe billing portal error:', stripeErr);
      
      // Check if this is a configuration error
      if (stripeErr instanceof Error && stripeErr.message && stripeErr.message.includes('No configuration provided')) {
        // For test mode, we'll provide a more helpful message
        if (isTestMode) {
          throw error(400, 'Stripe Customer Portal is not configured in test mode. Please set up your Customer Portal in the Stripe Dashboard: https://dashboard.stripe.com/test/settings/billing/portal');
        } else {
          throw error(400, 'Stripe Customer Portal is not configured in live mode. Please set up your Customer Portal in the Stripe Dashboard: https://dashboard.stripe.com/settings/billing/portal');
        }
      }
      
      throw error(500, stripeErr instanceof Error ? stripeErr.message : 'Failed to create billing portal session');
    }

  } catch (err: unknown) {
    console.error('Billing portal error:', err);
    
    // Handle different types of errors
    if (typeof err === 'object' && err !== null && 'status' in err && 'body' in err) {
      // This is already a SvelteKit error response
      throw err;
    }
    
    throw error(500, err instanceof Error ? err.message : 'Internal server error');
  }
};
