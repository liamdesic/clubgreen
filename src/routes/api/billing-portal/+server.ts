import { json, error } from '@sveltejs/kit';
import { stripe } from '$lib/server/stripe/client';
import { supabase } from '$lib/supabaseClient';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals: { getSession } }) => {
  try {
    const session = await getSession();
    if (!session) {
      throw error(401, 'Unauthorized');
    }

    // Get the customer ID from the subscription
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('organization_id', (await getOrganizationId(session.user.id))?.id || '')
      .single();

    if (subError || !subscription?.stripe_customer_id) {
      console.error('Error fetching subscription:', subError);
      throw error(404, 'No subscription found');
    }

    // Create billing portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
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

// Helper function to get organization ID for a user
async function getOrganizationId(userId: string) {
  const { data, error } = await supabase
    .from('organizations')
    .select('id')
    .eq('owner_id', userId)
    .single();
  
  if (error) {
    console.error('Error fetching organization:', error);
    return null;
  }
  
  return data;
}
