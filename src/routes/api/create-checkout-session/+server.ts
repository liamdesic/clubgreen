import { error, json } from '@sveltejs/kit';
import Stripe from 'stripe';
import { STRIPE_SECRET_KEY, STRIPE_PRICE_ID } from '$env/static/private';
import { supabase } from '$lib/supabaseClient';

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2024-09-30.acacia'
});

export async function POST({ request, locals }) {
  const { priceId, email, organizationId } = await request.json();
  
  if (!email) {
    throw error(400, 'Email is required');
  }

  try {
    // Get or create customer in Stripe
    let customerId: string;
    
    // Check if organization already has a customer ID
    if (organizationId) {
      const { data: org } = await supabase
        .from('organizations')
        .select('stripe_customer_id')
        .eq('id', organizationId)
        .single();
      
      if (org?.stripe_customer_id) {
        customerId = org.stripe_customer_id;
      }
    }

    // Create new customer if not exists
    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
        metadata: {
          organization_id: organizationId || 'new'
        }
      });
      customerId = customer.id;

      // Save customer ID to organization if we have one
      if (organizationId) {
        await supabase
          .from('organizations')
          .update({ stripe_customer_id: customerId })
          .eq('id', organizationId);
      }
    }

    // Create checkout session with 14-day trial
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{
        price: priceId || STRIPE_PRICE_ID,
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: `${new URL(request.url).origin}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${new URL(request.url).origin}/pricing?canceled=true`,
      subscription_data: {
        trial_period_days: 14,
      },
      allow_promotion_codes: true,
    });

    return json({ sessionId: session.id });
  } catch (err) {
    console.error('Error creating checkout session:', err);
    throw error(500, 'Error creating checkout session');
  }
}
