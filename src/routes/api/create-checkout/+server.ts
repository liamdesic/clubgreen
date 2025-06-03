import { json, error } from '@sveltejs/kit';
import { stripe } from '$lib/server/stripe/client';
import type { RequestHandler } from './$types';
import { STRIPE_PRICE_ID } from '$env/static/private';
import { dev } from '$app/environment';

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

    // Check for existing Stripe customer
    console.log('Checking for existing Stripe customer...');
    let customer;
    
    // First, check if organization already has a Stripe customer ID
    const { data: orgWithCustomer, error: orgFetchError } = await locals.supabase
      .from('organizations')
      .select('stripe_customer_id')
      .eq('id', orgData.id)
      .single();
    
    if (orgFetchError) {
      console.error('Error fetching organization:', orgFetchError);
      throw error(500, 'Failed to fetch organization details');
    }
    
    if (orgWithCustomer?.stripe_customer_id) {
      // Use existing customer
      console.log('Using existing Stripe customer:', orgWithCustomer.stripe_customer_id);
      try {
        customer = await stripe.customers.retrieve(orgWithCustomer.stripe_customer_id);
        console.log('Retrieved existing customer:', customer.id);
      } catch (stripeError) {
        console.error('Error retrieving Stripe customer, creating new one:', stripeError);
        // Fall through to create a new customer
      }
    }
    
    // If no customer found, create a new one
    if (!customer) {
      console.log('Creating new Stripe customer...');
      customer = await stripe.customers.create({
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
      
      console.log('New Stripe customer created:', customer.id);
      
      // Update organization with the new customer ID
      const { error: updateError } = await locals.supabase
        .from('organizations')
        .update({ 
          stripe_customer_id: customer.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', orgData.id);
        
      if (updateError) {
        console.error('Failed to update organization with Stripe customer ID:', updateError);
        // Continue anyway, as the checkout can still proceed
      }
    }

    // Check if organization has an existing subscription
    const { data: subscriptionData, error: subscriptionError } = await locals.supabase
      .from('organizations')
      .select('stripe_subscription_id, subscription_status')
      .eq('id', orgData.id)
      .single();

    // If user is on trial, update the existing subscription to end trial immediately
    if (subscriptionData?.subscription_status === 'trialing' && subscriptionData.stripe_subscription_id) {
      console.log('User is on trial, upgrading subscription...', {
        subscriptionId: subscriptionData.stripe_subscription_id,
        organizationId: orgData.id
      });

      try {
        // End trial immediately and bill the user
        const subscription = await stripe.subscriptions.update(
          subscriptionData.stripe_subscription_id,
          {
            trial_end: 'now',
            proration_behavior: 'create_prorations',
            payment_behavior: 'error_if_incomplete',
            // Removed expand: ['latest_invoice.payment_intent'] as it causes errors when payment_intent doesn't exist
            payment_settings: { save_default_payment_method: 'on_subscription' },
            metadata: {
              organizationId: orgData.id,
              userId: user.id,
              customerId: customer.id,
              upgraded_from_trial: 'true'
            }
          }
        );

        console.log('Subscription trial ended, billing user immediately', {
          subscriptionId: subscription.id,
          status: subscription.status
        });

        // Redirect to success page with subscription ID
        return json({
          url: `${url.origin}/dashboard?subscription_updated=true`,
          sessionId: subscription.id,
          isUpgrade: true
        });
      } catch (updateError) {
        console.error('Error updating subscription:', updateError);
        // Fall through to regular checkout if update fails
      }
    }

    // Create new checkout session for new subscriptions
    console.log('Creating new checkout session...');
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
      success_url: `${url.origin}/dashboard?session_id={CHECKOUT_SESSION_ID}&customer_id=${customer.id}`,
      cancel_url: `${url.origin}/pricing`,
      allow_promotion_codes: true,
      metadata: {
        organizationId: orgData.id,
        userId: user.id,
        customerId: customer.id,
      },
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          organizationId: orgData.id,
          userId: user.id,
          customerId: customer.id,
        },
      },
    });
    
    console.log('Checkout session created with customer ID:', customer.id);

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
    const isDev = dev;
    const clientErrorMessage = isDev
      ? `${errorMessage}${errorStack ? '\n' + errorStack : ''}`
      : 'Failed to create checkout session. Please try again.';
      
    throw error(errorStatus, clientErrorMessage);
  }
};
