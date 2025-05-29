import { error, json } from '@sveltejs/kit';
import Stripe from 'stripe';
import { SECRET_STRIPE_KEY, STRIPE_WEBHOOK_SECRET } from '$env/static/private';
import { supabase } from '$lib/supabaseClient';

const stripe = new Stripe(SECRET_STRIPE_KEY, {
  apiVersion: '2024-09-30.acacia'
});

export async function POST({ request }) {
  const payload = await request.text();
  const sig = request.headers.get('stripe-signature')!;
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    throw error(400, 'Invalid signature');
  }

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
    }
    return json({ received: true });
  } catch (err) {
    console.error('Error handling webhook:', err);
    throw error(500, 'Error processing webhook');
  }
}

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('stripe_customer_id', subscription.customer as string)
    .single();

  if (!org) return;

  const subscriptionData = {
    stripe_subscription_id: subscription.id,
    status: subscription.status,
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    trial_ends_at: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
    updated_at: new Date().toISOString()
  };

  await supabase
    .from('subscriptions')
    .upsert({
      ...subscriptionData,
      organization_id: org.id,
      stripe_customer_id: subscription.customer as string,
      created_at: new Date(subscription.created * 1000).toISOString()
    })
    .eq('organization_id', org.id);

  // Update organization's payment status
  await supabase
    .from('organizations')
    .update({
      payment_up_to_date: ['trialing', 'active'].includes(subscription.status)
    })
    .eq('id', org.id);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  await supabase
    .from('subscriptions')
    .update({
      status: 'canceled',
      updated_at: new Date().toISOString()
    })
    .eq('stripe_subscription_id', subscription.id);
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  if (invoice.billing_reason === 'subscription_create') {
    // The subscription is created and payment was successful
    await handleSubscriptionChange(await stripe.subscriptions.retrieve(invoice.subscription as string));
  }
  // Handle other payment success scenarios if needed
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  await supabase
    .from('subscriptions')
    .update({
      status: 'past_due',
      updated_at: new Date().toISOString()
    })
    .eq('stripe_subscription_id', invoice.subscription as string);
}
