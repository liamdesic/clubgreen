import { error, json } from '@sveltejs/kit';
import Stripe from 'stripe';
import { env as privateEnv } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { createClient } from '@supabase/supabase-js';

// Check required environment variables
if (!privateEnv.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY is not set');
if (!privateEnv.STRIPE_WEBHOOK_SECRET) throw new Error('STRIPE_WEBHOOK_SECRET is not set');
if (!publicEnv.PUBLIC_SUPABASE_URL) throw new Error('PUBLIC_SUPABASE_URL is not set');
if (!privateEnv.SUPABASE_SERVICE_ROLE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');

// Initialize Stripe with the latest API version
const stripe = new Stripe(privateEnv.STRIPE_SECRET_KEY, {
  apiVersion: '2024-09-30.acacia'
});

// Initialize Supabase Admin Client for server-side operations
const supabaseAdmin = createClient(
  publicEnv.PUBLIC_SUPABASE_URL,
  privateEnv.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST({ request }) {
  const payload = await request.text();
  const signature = request.headers.get('stripe-signature');
  
  if (!signature) {
    console.error('Missing Stripe signature');
    throw error(400, 'Missing Stripe signature');
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, privateEnv.STRIPE_WEBHOOK_SECRET);
  } catch (err: unknown) {
    console.error('Webhook signature verification failed:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    throw error(400, `Webhook Error: ${errorMessage}`);
  }

  console.log(`Processing webhook event: ${event.type}`);

  try {
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
        console.log(`Unhandled event type: ${event.type}`);
    }
    
    return json({ received: true });
  } catch (err) {
    console.error('Error handling webhook:', {
      error: err,
      eventType: event.type,
      eventId: event.id
    });
    throw error(500, 'Error processing webhook');
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
  console.log('Current subscription state:', {
    subscription_id: subscription.id,
    status: subscription.status,
    trial_end: subscription.trial_end,
    current_period_end: subscription.current_period_end,
    customer: customerId,
    organization: org.id
  });

  // Determine subscription status
  const now = Math.floor(Date.now() / 1000);
  const trialHasEnded = subscription.trial_end ? subscription.trial_end <= now : true;
  
  // If invoice is paid, always mark as active regardless of trial status
  const latestInvoice = subscription.latest_invoice as Stripe.Invoice | null;
  const isPaid = latestInvoice?.paid === true;
  
  // Determine effective status
  let effectiveStatus = subscription.status;
  if (isPaid && subscription.status === 'trialing') {
    effectiveStatus = 'active';
  } else if (trialHasEnded && subscription.status === 'trialing') {
    effectiveStatus = 'active';
  }

  console.log('Subscription status:', {
    now,
    trial_end: subscription.trial_end,
    trialHasEnded,
    isPaid,
    original_status: subscription.status,
    effective_status: effectiveStatus,
    invoice_status: latestInvoice?.status,
    invoice_paid: latestInvoice?.paid
  });

  const subscriptionData = {
    stripe_subscription_id: subscription.id,
    status: effectiveStatus,
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    trial_ends_at: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
    updated_at: new Date().toISOString(),
    stripe_customer_id: customerId,
    organization_id: org.id,
    // Add metadata for debugging
    metadata: {
      ...subscription.metadata,
      is_trial_upgrade: subscription.metadata?.is_trial_upgrade || 'false',
      last_updated: new Date().toISOString()
    }
  };
  
  console.log('Updating subscription with data:', subscriptionData);

  try {
    // First, try to insert the subscription
    const { error: insertError } = await supabaseAdmin
      .from('subscriptions')
      .insert({
        ...subscriptionData,
        created_at: new Date(subscription.created * 1000).toISOString()
      });

    // If insert fails with unique violation, try to update the existing record
    if (insertError?.code === '23505') {
      console.log('Subscription already exists, updating record');
      const { error: updateError } = await supabaseAdmin
        .from('subscriptions')
        .update(subscriptionData)
        .eq('stripe_customer_id', customerId);
      
      if (updateError) throw updateError;
    } else if (insertError) {
      throw insertError;
    }
  } catch (error) {
    console.error('Error in subscription upsert:', error);
    throw error;
  }

  // Update organization's payment status based on effective status
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

  const { data: org, error: orgError } = await supabaseAdmin
    .from('organizations')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (orgError || !org) {
    console.error('Organization not found for customer:', customerId, orgError);
    return;
  }

  const { error: updateError } = await supabaseAdmin
    .from('subscriptions')
    .update({
      status: 'canceled',
      updated_at: new Date().toISOString(),
      canceled_at: new Date().toISOString()
    })
    .eq('stripe_subscription_id', subscription.id);

  if (updateError) {
    console.error('Error canceling subscription:', updateError);
    throw updateError;
  }

  // Update organization's payment status
  await supabaseAdmin
    .from('organizations')
    .update({
      payment_up_to_date: false,
      updated_at: new Date().toISOString()
    })
    .eq('id', org.id);

  console.log(`Canceled subscription ${subscription.id} for organization ${org.id}`);
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return;
  
  console.log('Payment succeeded for invoice:', {
    id: invoice.id,
    billing_reason: invoice.billing_reason,
    subscription: invoice.subscription,
    paid: invoice.paid,
    status: invoice.status
  });

  // Get the subscription with expanded latest invoice
  const subscription = await stripe.subscriptions.retrieve(
    invoice.subscription as string,
    { expand: ['latest_invoice.payment_intent'] }
  );

  console.log('Retrieved subscription:', {
    id: subscription.id,
    status: subscription.status,
    trial_end: subscription.trial_end,
    latest_invoice: subscription.latest_invoice
  });

  // If this is a payment during trial, end the trial and activate immediately
  if (subscription.status === 'trialing' && invoice.paid) {
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

      // Force update the organization's payment status
      const customerId = typeof updatedSubscription.customer === 'string' 
        ? updatedSubscription.customer 
        : updatedSubscription.customer?.id;

      if (customerId) {
        const { data: org } = await supabaseAdmin
          .from('organizations')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (org) {
          await supabaseAdmin
            .from('organizations')
            .update({
              payment_up_to_date: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', org.id);
          
          console.log('Organization payment status updated to paid for org:', org.id);
        }
      }

      // Update subscription in our database
      await handleSubscriptionChange(updatedSubscription);
      return;
    } catch (error) {
      console.error('Error updating subscription to end trial:', error);
      throw error;
    }
  }
  
  // For non-trial subscriptions or if not paid yet
  await handleSubscriptionChange(subscription);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = typeof invoice.customer === 'string' 
    ? invoice.customer 
    : invoice.customer?.id;

  if (!customerId) {
    console.error('No customer ID found in invoice:', invoice.id);
    return;
  }

  // Update subscription status to past_due
  const subscriptionId = typeof invoice.subscription === 'string' 
    ? invoice.subscription 
    : invoice.subscription?.id;

  if (subscriptionId) {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    await handleSubscriptionChange(subscription);
  }

  // Notify user about payment failure
  console.log(`Payment failed for invoice ${invoice.id} (customer: ${customerId})`);

  // Update subscription status to past_due in the database
  if (invoice.subscription) {
    const subscriptionId = typeof invoice.subscription === 'string' 
      ? invoice.subscription 
      : invoice.subscription.id;

    await supabaseAdmin
      .from('subscriptions')
      .update({
        status: 'past_due',
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscriptionId);
  }
}
