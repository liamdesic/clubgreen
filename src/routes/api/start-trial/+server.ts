import { json, error } from '@sveltejs/kit';
import { stripe } from '$lib/server/stripe/client';
import { supabase } from '$lib/supabaseClient';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals: { getSession } }) => {
  try {
    const session = await getSession();
    if (!session) {
      throw error(401, 'Unauthorized');
    }

    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .eq('owner_id', session.user.id)
      .single();

    if (orgError || !orgData) {
      console.error('Error fetching organization:', orgError);
      throw error(404, 'Organization not found');
    }

    // Create or get Stripe customer
    const customer = await stripe.customers.create({
      email: session.user.email,
      metadata: {
        userId: session.user.id,
        organizationId: orgData.id
      }
    });

    // Create subscription with trial
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [
        {
          price: process.env.STRIPE_PRICE_ID, // Your Standard plan price ID
        },
      ],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      trial_period_days: 14,
    });

    // Save to database
    const { error: dbError } = await supabase.from('subscriptions').upsert({
      organization_id: orgData.id,
      stripe_customer_id: customer.id,
      stripe_subscription_id: subscription.id,
      status: 'trialing',
      trial_ends_at: new Date((subscription.trial_end || 0) * 1000).toISOString(),
      current_period_end: new Date((subscription.current_period_end || 0) * 1000).toISOString(),
    });

    if (dbError) {
      console.error('Database error:', dbError);
      throw error(500, 'Failed to save subscription');
    }

    // Update organization payment status
    const { error: orgUpdateError } = await supabase
      .from('organizations')
      .update({ payment_up_to_date: true })
      .eq('id', orgData.id);

    if (orgUpdateError) {
      console.error('Error updating organization:', orgUpdateError);
      // Don't fail the request for this
    }

    return json({
      success: true,
      subscriptionId: subscription.id,
      status: subscription.status,
      trialEnd: subscription.trial_end
    });

  } catch (err) {
    console.error('Trial creation error:', err);
    throw error(500, {
      message: err instanceof Error ? err.message : 'Internal server error'
    });
  }
};
