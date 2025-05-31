import { json, error } from '@sveltejs/kit';
import { stripe } from '$lib/server/stripe/client';
import type { RequestHandler } from './$types';

// Import environment variables
import { STRIPE_PRICE_ID } from '$env/static/private';

// Debug environment variables
console.log('[DEBUG] STRIPE_PRICE_ID from $env/static/private:', STRIPE_PRICE_ID);

export const POST: RequestHandler = async ({ locals }) => {
  if (!locals.session) {
    throw error(401, 'Unauthorized - Please log in');
  }
  try {
    console.log('Starting trial creation process...');
    
    const user = locals.session.user;
    console.log('Authenticated user:', user.id);

    // Get the organization for this user
    console.log('Fetching organization for user:', user.id);
    const { data: orgData, error: orgError } = await locals.supabase
      .from('organizations')
      .select('id')
      .eq('owner_id', user.id)
      .single();

    if (orgError || !orgData) {
      console.error('Error fetching organization:', orgError);
      throw error(404, 'Organization not found');
    }
    
    console.log('Found organization:', orgData.id);

    // Create or get Stripe customer
    console.log('Creating Stripe customer for:', user.email);
    let customer;
    try {
      customer = await stripe.customers.create({
        email: user.email!,
        metadata: {
          userId: user.id,
          organizationId: orgData.id
        }
      });
      console.log('Created Stripe customer:', customer.id);
    } catch (stripeError) {
      console.error('Stripe customer creation failed:', stripeError);
      throw new Error(`Failed to create Stripe customer: ${stripeError.message}`);
    }

    // Create subscription with trial
    console.log('Creating Stripe subscription with trial');
    let subscription;
    try {
      if (!STRIPE_PRICE_ID) {
        throw new Error('STRIPE_PRICE_ID is not set in environment variables');
      }
      
      subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [
          {
            price: STRIPE_PRICE_ID,
          },
        ],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
        trial_period_days: 14,
      });
      console.log('Created subscription:', subscription.id);
    } catch (subscriptionError) {
      console.error('Subscription creation failed:', subscriptionError);
      throw new Error(`Failed to create subscription: ${subscriptionError.message}`);
    }

    // Save to database
    const trialEndsAt = new Date((subscription.trial_end || 0) * 1000).toISOString();
    const currentPeriodEnd = new Date((subscription.current_period_end || 0) * 1000).toISOString();
    
    console.log('Saving subscription to database with trial_end:', trialEndsAt);
    
    const { error: dbError } = await locals.supabase.from('subscriptions').upsert({
      organization_id: orgData.id,
      stripe_customer_id: customer.id,
      stripe_subscription_id: subscription.id,
      status: 'trialing',
      trial_ends_at: trialEndsAt,
      current_period_end: currentPeriodEnd,
    });

    if (dbError) {
      console.error('Database error:', dbError);
      throw error(500, 'Failed to save subscription');
    }

    // Update organization with subscription and trial details
    const { error: orgUpdateError } = await locals.supabase
      .from('organizations')
      .update({ 
        payment_up_to_date: true,
        stripe_customer_id: customer.id,
        stripe_subscription_id: subscription.id,
        trial_ends_at: trialEndsAt,
        subscription_status: 'trialing',
        current_period_end: currentPeriodEnd,
        updated_at: new Date().toISOString()
      })
      .eq('id', orgData.id);
      
    console.log('Updated organization with trial information, trial ends at:', trialEndsAt);

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
