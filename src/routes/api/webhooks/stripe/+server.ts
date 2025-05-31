import { error, json } from '@sveltejs/kit';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import type StripeType from 'stripe';
import {
  STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET,
  SUPABASE_SERVICE_ROLE_KEY
} from '$env/static/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';

// Check required environment variables
if (!STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY is not set');
if (!STRIPE_WEBHOOK_SECRET) throw new Error('STRIPE_WEBHOOK_SECRET is not set');
if (!PUBLIC_SUPABASE_URL) throw new Error('PUBLIC_SUPABASE_URL is not set');
if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');

// Initialize Stripe with the latest API version
const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2025-05-28.basil'
});

// Initialize Supabase Admin Client for server-side operations
const supabaseAdmin = createClient(
  PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
);

export async function POST({ request }) {
  const payload = await request.text();
  const signature = request.headers.get('stripe-signature');
  
  if (!signature) {
    console.error('[WEBHOOK] Missing Stripe signature');
    throw error(400, 'Missing Stripe signature');
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, STRIPE_WEBHOOK_SECRET);
    console.log(`[WEBHOOK] Received valid webhook: ${event.type}`, {
      event_id: event.id,
      livemode: event.livemode,
      created: new Date(event.created * 1000).toISOString()
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    console.error('[WEBHOOK] Signature verification failed:', {
      error: errorMessage,
      signature: signature.substring(0, 20) + '...', // Log partial signature for debugging
      payload_length: payload.length
    });
    throw error(400, `Webhook Error: ${errorMessage}`);
  }

  try {
    console.log(`[WEBHOOK] Processing event: ${event.type}`, {
      event_id: event.id,
      object_id: (event.data.object as any)?.id || 'unknown',
      livemode: event.livemode
    });

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionChange(event.data.object as Stripe.Subscription);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
      
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      

      default:
        console.log(`[WEBHOOK] Unhandled event type: ${event.type}`, {
          event_id: event.id,
          object_type: (event.data.object as any)?.object || 'unknown'
        });
    }
    
    console.log(`[WEBHOOK] Successfully processed event: ${event.type}`, {
      event_id: event.id,
      object_id: (event.data.object as any)?.id || 'unknown'
    });
    
    return json({ received: true });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('[WEBHOOK] Handler error:', {
      error: errorMessage,
      event_type: event.type,
      event_id: event.id,
      stack: err instanceof Error ? err.stack : undefined
    });
    throw error(500, 'Webhook handler failed');
  }
}

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === 'string' 
    ? subscription.customer 
    : subscription.customer.id;

  if (!customerId) {
    console.error('No customer ID found in subscription:', subscription.id);
    return;
  }

  console.log('Processing subscription for customer ID:', customerId);

  // First, try to find the organization by stripe_customer_id
  const { data: org, error: orgError } = await supabaseAdmin
    .from('organizations')
    .select('id, stripe_customer_id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();

  if (orgError) {
    console.error('Error fetching organization:', orgError);
    return;
  }

  if (!org) {
    // If no org found with this customer ID, log all organizations for debugging
    console.log('No organization found with stripe_customer_id:', customerId);
    
    // Get all organizations for debugging (limit to 10 to avoid too much output)
    const { data: allOrgs, error: allOrgsError } = await supabaseAdmin
      .from('organizations')
      .select('id, stripe_customer_id, name')
      .limit(10);
    
    if (!allOrgsError) {
      console.log('Existing organizations in database:', allOrgs);
    } else {
      console.error('Error fetching organizations:', allOrgsError);
    }
    
    return;
  }

  // Log current subscription state
  const currentPeriodEnd = subscription.current_period_end || (subscription as any).current_period_end || Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60; // Default to 30 days from now if not set
  console.log('Current subscription state:', {
    subscription_id: subscription.id,
    status: subscription.status,
    trial_end: subscription.trial_end,
    current_period_end: currentPeriodEnd,
    customer: customerId,
    organization: org.id
  });

  // Determine subscription status
  const now = Math.floor(Date.now() / 1000);
  const trialHasEnded = subscription.trial_end ? subscription.trial_end <= now : true;
  
  // Get the latest invoice if available
  const latestInvoice = subscription.latest_invoice as Stripe.Invoice | null;
  
  // Check if this is an upgrade from trial (trial ended early)
  const isUpgradeFromTrial = subscription.metadata?.upgraded_from_trial === 'true';
  
  // Determine effective status
  let effectiveStatus = subscription.status;
  
  // If this is an upgrade from trial or invoice is paid, mark as active
  if (isUpgradeFromTrial || latestInvoice?.paid === true) {
    effectiveStatus = 'active';
  } else if (trialHasEnded && subscription.status === 'trialing') {
    effectiveStatus = 'active';
  }

  console.log('Subscription status:', {
    now,
    trial_end: subscription.trial_end,
    trialHasEnded,
    is_upgrade_from_trial: isUpgradeFromTrial,
    original_status: subscription.status,
    effective_status: effectiveStatus,
    invoice_status: latestInvoice?.status,
    invoice_paid: latestInvoice?.paid
  });

  // Update organization with subscription details
  const { error: updateError } = await supabaseAdmin
    .from('organizations')
    .update({
      stripe_subscription_id: subscription.id,
      subscription_status: effectiveStatus,
      current_period_end: new Date(currentPeriodEnd * 1000).toISOString(),
      trial_ends_at: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
      payment_up_to_date: ['active', 'trialing'].includes(effectiveStatus),
      updated_at: new Date().toISOString()
    })
    .eq('stripe_customer_id', customerId);

  if (updateError) {
    console.error('Error updating organization with subscription details:', updateError);
    throw updateError;
  }

  const paymentUpToDate = ['active', 'trialing'].includes(effectiveStatus);
  
  console.log('Updating organization payment status:', {
    organization_id: org.id,
    payment_up_to_date: paymentUpToDate,
    effective_status: effectiveStatus
  });

  const { error: orgUpdateError } = await supabaseAdmin
    .from('organizations')
    .update({
      payment_up_to_date: paymentUpToDate,
      updated_at: new Date().toISOString()
    })
    .eq('id', org.id);

  if (orgUpdateError) {
    console.error('Error updating organization payment status:', orgUpdateError);
    throw orgUpdateError;
  } else {
    console.log('Successfully updated organization payment status');
  }

  console.log(`Updated subscription ${subscription.id} for organization ${org.id}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === 'string' 
    ? subscription.customer 
    : subscription.customer?.id;

  if (!customerId) {
    console.error('No customer ID found in subscription:', subscription.id);
    return;
  }

  console.log('Processing subscription deletion for customer ID:', customerId);

  // Update organization's subscription status to canceled
  const { error: updateError } = await supabaseAdmin
    .from('organizations')
    .update({ 
      subscription_status: 'canceled',
      payment_up_to_date: false,
      updated_at: new Date().toISOString()
    })
    .eq('stripe_customer_id', customerId);

  if (updateError) {
    console.error('Error updating organization after subscription deletion:', updateError);
    throw updateError;
  }

  console.log(`Marked subscription as canceled for organization with customer ID: ${customerId}`);
}

// Utility function to safely extract subscription ID from various Stripe objects
function getSubscriptionId(subscription: string | { id: string } | StripeType.Subscription | null | undefined): string | null {
  if (!subscription) return null;
  if (typeof subscription === 'string') return subscription;
  return subscription.id || null;
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  if (!invoice.subscription) {
    console.log('No subscription found in invoice, skipping');
    return;
  }

  const subscriptionId = getSubscriptionId(invoice.subscription);
  if (!subscriptionId) {
    console.error('No valid subscription ID found in invoice');
    return;
  }

  console.log('Payment succeeded for invoice:', {
    id: invoice.id,
    billing_reason: invoice.billing_reason,
    subscription: subscriptionId,
    paid: invoice.status === 'paid',
    status: invoice.status
  });

  try {
    // Get the subscription with expanded latest invoice
    const subscription = await stripe.subscriptions.retrieve(
      subscriptionId,
      { expand: ['latest_invoice.payment_intent'] }
    );

    console.log('Retrieved subscription:', {
      id: subscription.id,
      status: subscription.status,
      trial_end: subscription.trial_end,
      latest_invoice: subscription.latest_invoice
    });

    // If this is a payment during trial, end the trial and activate immediately
    if (subscription.status === 'trialing' && invoice.status === 'paid') {
      console.log('Processing trial upgrade for subscription:', subscription.id);
      
      try {
        // End trial and activate subscription
        const updatedSubscription = await stripe.subscriptions.update(subscription.id, {
          trial_end: 'now',
          proration_behavior: 'none',
          payment_behavior: 'default_incomplete',
          payment_settings: { save_default_payment_method: 'on_subscription' },
          expand: ['latest_invoice.payment_intent']
        });

        console.log('Trial ended, subscription updated:', {
          id: updatedSubscription.id,
          status: updatedSubscription.status,
          trial_end: updatedSubscription.trial_end
        });

        // Update the organization's status to active
        const customerId = typeof updatedSubscription.customer === 'string' 
          ? updatedSubscription.customer 
          : (updatedSubscription.customer as Stripe.Customer)?.id;

        if (customerId) {
          // Get the current period end from the subscription using type assertion
          const currentPeriodEnd = (updatedSubscription as unknown as { current_period_end?: number }).current_period_end;
          
          await supabaseAdmin
            .from('organizations')
            .update({
              payment_up_to_date: true,
              subscription_status: 'active',
              trial_ends_at: new Date().toISOString(),
              current_period_end: currentPeriodEnd 
                ? new Date(currentPeriodEnd * 1000).toISOString() 
                : null,
              updated_at: new Date().toISOString()
            })
            .eq('stripe_customer_id', customerId);
          
          console.log('Organization upgraded from trial to active for customer ID:', customerId);
        }
        
        return;
      } catch (error) {
        console.error('Error updating subscription to end trial:', error);
        throw error;
      }
    }
    
    // For non-trial subscriptions, update the organization's subscription status
    const customerId = typeof subscription.customer === 'string' 
      ? subscription.customer 
      : subscription.customer?.id;

    if (customerId) {
      // Get the current period end from the subscription using type assertion
      const currentPeriodEnd = (subscription as unknown as { current_period_end?: number }).current_period_end;
        
      await supabaseAdmin
        .from('organizations')
        .update({
          payment_up_to_date: true,
          subscription_status: 'active',
          current_period_end: currentPeriodEnd 
            ? new Date(currentPeriodEnd * 1000).toISOString() 
            : null,
          updated_at: new Date().toISOString()
        })
        .eq('stripe_customer_id', customerId);
    }
  } catch (error) {
    console.error('Error processing payment succeeded webhook:', error);
    throw error;
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  try {
    const customerId = typeof invoice.customer === 'string' 
      ? invoice.customer 
      : invoice.customer?.id;

    if (!customerId) {
      console.error('No customer ID found in invoice:', invoice.id);
      return;
    }

    // Get subscription ID safely
    const subscriptionId = getSubscriptionId(invoice.subscription);
    if (!subscriptionId) {
      console.error('No valid subscription ID found in invoice:', invoice.id);
      return;
    }

    // Update organization's payment status to past_due
    const { error: updateError } = await supabaseAdmin
      .from('organizations')
      .update({
        subscription_status: 'past_due',
        payment_up_to_date: false,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_customer_id', customerId);

    if (updateError) {
      console.error('Error updating organization after failed payment:', updateError);
      throw updateError;
    }

    console.log(`Payment failed for invoice ${invoice.id} (customer: ${customerId})`);
  } catch (error) {
    console.error('Error handling failed payment:', error);
    throw error;
  }
}
