import { json, error } from '@sveltejs/kit';
import { stripe } from '$lib/server/stripe/client';
import { supabase } from '$lib/supabaseClient';
import type { RequestHandler } from './$types';

// Helper to get raw body
const getRawBody = async (request: Request): Promise<Buffer> => {
  return Buffer.from(await request.arrayBuffer());
};

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await getRawBody(request);
    const signature = request.headers.get('stripe-signature') || '';
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not set');
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      throw error(400, 'Invalid signature');
    }

    // Handle the event
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
      
      case 'customer.subscription.trial_will_end':
        await handleTrialEnding(event.data.object as Stripe.Subscription);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    throw error(500, 'Webhook error');
  }
};

// Helper functions for different event types
async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  const { error } = await supabase
    .from('subscriptions')
    .upsert({
      stripe_subscription_id: subscription.id,
      status: subscription.status,
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      trial_ends_at: subscription.trial_end 
        ? new Date(subscription.trial_end * 1000).toISOString() 
        : null,
      updated_at: new Date().toISOString()
    })
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    console.error('Error updating subscription:', error);
    throw error;
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const { error } = await supabase
    .from('subscriptions')
    .update({ 
      status: 'canceled',
      updated_at: new Date().toISOString()
    })
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    console.error('Error canceling subscription:', error);
    throw error;
  }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  if (typeof invoice.subscription !== 'string') return;
  
  const { error } = await supabase
    .from('subscriptions')
    .update({ 
      status: 'active',
      updated_at: new Date().toISOString()
    })
    .eq('stripe_subscription_id', invoice.subscription);

  if (error) {
    console.error('Error updating subscription after payment:', error);
    throw error;
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  if (typeof invoice.subscription !== 'string') return;
  
  const { error } = await supabase
    .from('subscriptions')
    .update({ 
      status: 'past_due',
      updated_at: new Date().toISOString()
    })
    .eq('stripe_subscription_id', invoice.subscription);

  if (error) {
    console.error('Error updating subscription after failed payment:', error);
    throw error;
  }
}

async function handleTrialEnding(subscription: Stripe.Subscription) {
  // Send reminder email or notification
  // You can implement this based on your notification system
  console.log(`Trial ending soon for subscription: ${subscription.id}`);
  
  // Example: Send email to customer
  // await sendTrialEndingEmail(subscription.customer);
}
