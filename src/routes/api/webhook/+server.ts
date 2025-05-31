import { json, error } from '@sveltejs/kit';
import { stripe } from '$lib/server/stripe/client';
import { supabase } from '$lib/supabaseClient';
import type { RequestHandler } from './$types';
import type Stripe from 'stripe';

// Utility function to safely extract subscription ID from various Stripe objects
function getSubscriptionId(subscription: string | { id: string } | Stripe.Subscription | null | undefined): string | null {
  if (!subscription) return null;
  if (typeof subscription === 'string') return subscription;
  return subscription.id || null;
}

// Helper to get raw body
const getRawBody = async (request: Request): Promise<Buffer> => {
  return Buffer.from(await request.arrayBuffer());
};

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await getRawBody(request);
    const signature = request.headers.get('stripe-signature') || '';
    if (!import.meta.env.STRIPE_WEBHOOK_SECRET) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not set');
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, import.meta.env.STRIPE_WEBHOOK_SECRET);
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
async function handleSubscriptionChange(subscription: Stripe.Subscription | Stripe.SubscriptionCreateParams) {
  // Type guard to check if it's a Stripe.Subscription
  const isStripeSubscription = (sub: any): sub is Stripe.Subscription => {
    return 'id' in sub && 'status' in sub;
  };

  // Skip if it's not a full subscription object
  if (!isStripeSubscription(subscription)) {
    console.log('Skipping subscription update: Not a full subscription object');
    return;
  }

  // Get the customer ID from the subscription
  const customerId = typeof subscription.customer === 'string' 
    ? subscription.customer 
    : subscription.customer?.id;

  if (!customerId) {
    console.error('No customer ID found in subscription:', subscription.id);
    return;
  }

  // Prepare update data for organization
  const updateData: {
    subscription_status: string;
    current_period_end?: string | null;
    trial_ends_at?: string | null;
    payment_up_to_date: boolean;
    updated_at: string;
  } = {
    subscription_status: subscription.status,
    payment_up_to_date: ['active', 'trialing'].includes(subscription.status),
    updated_at: new Date().toISOString()
  };

  // Handle current_period_end
  if ('current_period_end' in subscription && subscription.current_period_end) {
    const periodEnd = subscription.current_period_end;
    let timestamp: number;
    
    if (typeof periodEnd === 'number') {
      timestamp = periodEnd;
    } else if (periodEnd instanceof Date) {
      timestamp = periodEnd.getTime() / 1000;
    } else if (typeof periodEnd === 'string') {
      const date = new Date(periodEnd);
      if (!isNaN(date.getTime())) {
        timestamp = date.getTime() / 1000;
      } else {
        console.warn('Invalid date format for current_period_end:', periodEnd);
        return;
      }
    } else {
      console.warn('Unsupported type for current_period_end:', typeof periodEnd);
      return;
    }
    
    updateData.current_period_end = new Date(timestamp * 1000).toISOString();
  }

  // Handle trial end
  if ('trial_end' in subscription && subscription.trial_end) {
    updateData.trial_ends_at = new Date(subscription.trial_end * 1000).toISOString();
  }

  // Update the organization record
  const { error } = await supabase
    .from('organizations')
    .update(updateData)
    .eq('stripe_customer_id', customerId);

  if (error) {
    console.error('Error updating organization subscription:', error);
    throw error;
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  // Get the customer ID from the subscription
  const customerId = typeof subscription.customer === 'string' 
    ? subscription.customer 
    : subscription.customer?.id;

  if (!customerId) {
    console.error('No customer ID found in subscription:', subscription.id);
    return;
  }

  const { error } = await supabase
    .from('organizations')
    .update({ 
      subscription_status: 'canceled',
      payment_up_to_date: false,
      updated_at: new Date().toISOString()
    })
    .eq('stripe_customer_id', customerId);

  if (error) {
    console.error('Error updating organization after subscription deletion:', error);
    throw error;
  }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  // Get the customer ID from the invoice
  const customerId = typeof invoice.customer === 'string' 
    ? invoice.customer 
    : invoice.customer?.id;

  if (!customerId) {
    console.error('No customer ID found in invoice:', invoice.id);
    return;
  }
  
  // Get subscription ID from the invoice
  const subscriptionId = getSubscriptionId((invoice as any).subscription);
  
  if (!subscriptionId) {
    console.error('No subscription ID found in invoice');
    return;
  }
  
  // Update the organization's subscription status
  const { error } = await supabase
    .from('organizations')
    .update({ 
      subscription_status: 'active',
      payment_up_to_date: true,
      updated_at: new Date().toISOString()
    })
    .eq('stripe_customer_id', customerId);

  if (error) {
    console.error('Error updating organization after successful payment:', error);
    throw error;
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice & { subscription?: string | { id: string } }) {
  // Get the customer ID from the invoice
  const customerId = typeof invoice.customer === 'string' 
    ? invoice.customer 
    : invoice.customer?.id;

  if (!customerId) {
    console.error('No customer ID found in invoice:', invoice.id);
    return;
  }

  // Update the organization's payment status
  const { error } = await supabase
    .from('organizations')
    .update({ 
      subscription_status: 'past_due',
      payment_up_to_date: false,
      updated_at: new Date().toISOString()
    })
    .eq('stripe_customer_id', customerId);

  if (error) {
    console.error('Error updating organization after failed payment:', error);
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
