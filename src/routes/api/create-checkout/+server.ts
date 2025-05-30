import { json, error } from '@sveltejs/kit';
import { stripe } from '$lib/server/stripe/client';
import { STRIPE_PRICE_ID } from '$env/static/private';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals, url }) => {
  try {
    console.log('Starting checkout process...');
    
    // Verify required environment variables
    if (!STRIPE_PRICE_ID) {
      throw new Error('STRIPE_PRICE_ID is not set in environment variables');
    }
    
    console.log('Using Stripe Price ID:', STRIPE_PRICE_ID);
    
    // Get the authenticated user from locals
    const { user } = await locals.getSession();
    if (!user) {
      throw error(401, 'Unauthorized: Please log in');
    }
    
    console.log('Authenticated user:', { 
      userId: user.id, 
      email: user.email 
    });

    // Fetch organization
    const { data: orgData, error: orgError } = await locals.supabase
      .from('organizations')
      .select('id, name')
      .eq('owner_id', user.id)
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

    // Create or get Stripe customer
    console.log('Creating Stripe customer...');
    const customer = await stripe.customers.create({
      email: user.email || undefined,
      name: user.user_metadata?.full_name || '',
      metadata: {
        userId: user.id,
        organizationId: orgData.id
      },
      address: {
        line1: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        postal_code: '12345',
        country: 'US',
      },
    });
    
    console.log('Stripe customer created:', customer.id);

    // Create checkout session
    console.log('Creating checkout session...');
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price: STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${url.origin}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${url.origin}/pricing`,
      allow_promotion_codes: true,
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          organizationId: orgData.id,
        },
      },
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
    
  } catch (err: unknown) {
    // Type guard to check if error is an instance of Error
    const errorMessage = err instanceof Error 
      ? err.message 
      : 'An unknown error occurred';
      
    const errorStack = err instanceof Error ? err.stack : undefined;
    const errorStatus = (err as any)?.status || 500;
    
    console.error('Checkout process failed:', {
      error: err,
      message: errorMessage,
      stack: errorStack,
      status: errorStatus
    });
    
    // Return a more detailed error to the client in development
    const isDev = import.meta.env.DEV;
    const clientErrorMessage = isDev
      ? `${errorMessage}${errorStack ? '\n' + errorStack : ''}`
      : 'Failed to create checkout session. Please try again.';
      
    throw error(errorStatus, clientErrorMessage);
  }
};
