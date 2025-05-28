import { json, error } from '@sveltejs/kit';
import { stripe } from '$lib/server/stripe/client';
import { supabase } from '$lib/supabaseClient';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals: { getSession }, url }) => {
  try {
    console.log('Starting checkout process...');
    
    // Verify required environment variables
    const stripePriceId = process.env.STRIPE_PRICE_ID;
    if (!stripePriceId) {
      throw new Error('STRIPE_PRICE_ID is not set in environment variables');
    }
    
    console.log('Using Stripe Price ID:', stripePriceId);
    
    const session = await getSession();
    if (!session) {
      throw error(401, 'Unauthorized: No session found');
    }
    
    console.log('User session found:', { 
      userId: session.user?.id, 
      email: session.user?.email 
    });

    // Fetch organization
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('owner_id', session.user.id)
      .single();

    if (orgError || !orgData) {
      const errorMsg = orgError ? orgError.message : 'Organization not found';
      console.error('Error fetching organization:', errorMsg);
      throw error(404, `Organization not found: ${errorMsg}`);
    }
    
    console.log('Organization found:', { 
      orgId: orgData.id, 
      name: orgData.name 
    });

    try {
      // Create or get Stripe customer
      console.log('Creating Stripe customer...');
      const customer = await stripe.customers.create({
        email: session.user.email,
        name: session.user.user_metadata?.full_name || '',
        metadata: {
          userId: session.user.id,
          organizationId: orgData.id,
          organizationName: orgData.name
        }
      });
      
      console.log('Stripe customer created:', customer.id);

      // Create checkout session
      console.log('Creating checkout session...');
      const checkoutSession = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price: stripePriceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${url.origin}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${url.origin}/subscribe?canceled=true`,
        customer: customer.id,
        subscription_data: {
          trial_period_days: 0, // No trial for direct subscription
          metadata: {
            organizationId: orgData.id,
            organizationName: orgData.name
          }
        },
        allow_promotion_codes: true,
      });

      if (!checkoutSession.url) {
        throw new Error('Failed to create checkout session: No URL returned');
      }
      
      console.log('Checkout session created successfully:', {
        sessionId: checkoutSession.id,
        url: checkoutSession.url.replace(/\?.*$/, '') // Remove query params from URL in logs
      });
      
      return json({ 
        url: checkoutSession.url,
        sessionId: checkoutSession.id
      });
      
    } catch (stripeError) {
      console.error('Stripe API Error:', {
        message: stripeError.message,
        type: stripeError.type,
        code: stripeError.code,
        statusCode: stripeError.statusCode,
        raw: stripeError.raw
      });
      throw new Error(`Stripe error: ${stripeError.message}`);
    }
    
  } catch (err) {
    console.error('Checkout process failed:', {
      error: err,
      message: err.message,
      stack: err.stack,
      status: err.status
    });
    
    // Return a more detailed error to the client in development
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? `${err.message}\n${err.stack}` 
      : 'Failed to create checkout session. Please try again.';
      
    throw error(err.status || 500, errorMessage);
  }
};
