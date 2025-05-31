import { json, error } from '@sveltejs/kit';
import { stripe } from '$lib/server/stripe/client';
import { createAdminClient } from '$lib/supabase/server';
import type { RequestHandler } from './$types';

// Environment variables are accessed via import.meta.env in SvelteKit

// Debug environment variables
console.log('[DEBUG] STRIPE_PRICE_ID from import.meta.env:', import.meta.env.STRIPE_PRICE_ID);

// Create admin client for critical database operations
const supabaseAdmin = createAdminClient();

export const POST: RequestHandler = async ({ locals }) => {
  if (!locals.session) {
    throw error(401, 'Unauthorized - Please log in');
  }
  try {
    console.log('Starting trial creation process...');
    
    const user = locals.session.user;
    console.log('Authenticated user:', user.id);

    // Get the organization for this user using admin client
    console.log('Fetching organization for user:', user.id);
    const { data: orgData, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('id, subscription_status')
      .eq('owner_id', user.id)
      .single();

    if (orgError || !orgData) {
      console.error('Error fetching organization:', orgError);
      throw error(404, 'Organization not found');
    }

    // Prevent starting a trial if already on a paid plan
    if (orgData.subscription_status === 'active') {
      throw error(400, 'Organization already has an active subscription');
    }
    
    console.log('Found organization:', orgData.id);

    // Create or get Stripe customer
    console.log('[TRIAL] Creating Stripe customer for:', {
      user_id: user.id,
      email: user.email,
      organization_id: orgData.id
    });
    
    let customer;
    try {
      customer = await stripe.customers.create({
        email: user.email!,
        metadata: {
          userId: user.id,
          organizationId: orgData.id
        }
      });
      
      console.log('[TRIAL] Successfully created Stripe customer:', {
        customer_id: customer.id,
        organization_id: orgData.id,
        email: user.email
      });
    } catch (stripeError) {
      console.error('[TRIAL] Error creating Stripe customer:', {
        error: stripeError,
        user_id: user.id,
        organization_id: orgData.id,
        email: user.email
      });
      throw error(500, 'Failed to create Stripe customer');
    }

    // Create subscription with trial
    console.log('[TRIAL] Creating subscription with trial', {
      customer_id: customer.id,
      organization_id: orgData.id,
      price_id: import.meta.env.STRIPE_PRICE_ID
    });
    
    let subscription;
    try {
      subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [
          {
            price: import.meta.env.STRIPE_PRICE_ID,
          },
        ],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
        trial_period_days: 7,
        metadata: {
          is_trial: 'true',
          user_id: user.id,
          organization_id: orgData.id
        },
      });
      
      console.log('[TRIAL] Successfully created subscription', {
        subscription_id: subscription.id,
        status: subscription.status,
        trial_end: subscription.trial_end,
        customer_id: customer.id,
        organization_id: orgData.id
      });
    } catch (subscriptionError) {
      console.error('[TRIAL] Error creating subscription:', {
        error: subscriptionError,
        customer_id: customer.id,
        organization_id: orgData.id,
        price_id: import.meta.env.STRIPE_PRICE_ID
      });
      throw error(500, 'Failed to create subscription');
    }

    // Save subscription details directly to organizations table
    const trialEndsAt = subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null;
    // Safely access current_period_end from the subscription object
    const subscriptionData = subscription as any; // Type assertion to access current_period_end
    const currentPeriodEnd = subscriptionData.current_period_end 
      ? new Date(subscriptionData.current_period_end * 1000).toISOString() 
      : null;

    console.log('[TRIAL] Updating organization with subscription details', {
      organization_id: orgData.id,
      customer_id: customer.id,
      subscription_id: subscription.id,
      trial_ends_at: trialEndsAt,
      current_period_end: currentPeriodEnd
    });

    const { error: updateError } = await supabaseAdmin
      .from('organizations')
      .update({
        stripe_customer_id: customer.id,
        stripe_subscription_id: subscription.id,
        subscription_status: 'trialing',
        trial_ends_at: trialEndsAt,
        current_period_end: currentPeriodEnd,
        payment_up_to_date: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', orgData.id);

    if (updateError) {
      console.error('[TRIAL] Error updating organization:', {
        error: updateError,
        organization_id: orgData.id,
        subscription_id: subscription.id
      });
      throw error(500, 'Failed to update organization with subscription details');
    }
    
    console.log('[TRIAL] Successfully updated organization with subscription details', {
      organization_id: orgData.id,
      subscription_id: subscription.id,
      trial_ends_at: trialEndsAt,
      current_period_end: currentPeriodEnd
    });

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
