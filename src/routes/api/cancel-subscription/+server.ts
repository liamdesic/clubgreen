import { json, error } from '@sveltejs/kit';
import { stripe } from '$lib/server/stripe/client';
import type { RequestHandler } from './$types';
import type Stripe from 'stripe';

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    console.log('Starting subscription cancellation process...');
    
    // Get the authenticated user from locals
    const { user } = await locals.getSession();
    if (!user) {
      throw error(401, 'Unauthorized: Please log in');
    }
    
    console.log('Authenticated user:', { 
      userId: user.id, 
      email: user.email 
    });

    // Get request body
    const body = await request.json();
    const { organizationId } = body;
    
    if (!organizationId) {
      throw error(400, 'Organization ID is required');
    }

    // Fetch organization with subscription details
    const { data: organization, error: orgError } = await locals.supabase
      .from('organizations')
      .select('id, stripe_customer_id, stripe_subscription_id, subscription_status')
      .eq('id', organizationId)
      .eq('owner_id', user.id) // Ensure user owns this organization
      .single();

    if (orgError || !organization) {
      const errorMsg = orgError ? orgError.message : 'Organization not found';
      console.error('Error fetching organization:', errorMsg);
      throw error(404, `Organization not found: ${errorMsg}`);
    }
    
    if (!organization.stripe_subscription_id) {
      throw error(404, 'No active subscription found for this organization');
    }

    // Cancel the subscription at period end
    const subscription = await stripe.subscriptions.update(
      organization.stripe_subscription_id,
      {
        cancel_at_period_end: true,
        metadata: {
          canceled_by: user.id,
          canceled_at: new Date().toISOString()
        }
      }
    ) as Stripe.Subscription;
    
    console.log('Subscription scheduled for cancellation:', {
      subscriptionId: subscription.id,
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      currentPeriodEnd: (subscription as any).current_period_end ? new Date((subscription as any).current_period_end * 1000).toISOString() : null
    });

    // Update organization record with cancellation info
    // Note: The webhook will update the status when the subscription actually ends
    const { error: updateError } = await locals.supabase
      .from('organizations')
      .update({ 
        subscription_status: 'active_canceling',
        updated_at: new Date().toISOString()
      })
      .eq('id', organizationId);
      
    if (updateError) {
      console.error('Failed to update organization with cancellation status:', updateError);
      // Continue anyway as the subscription has been canceled in Stripe
    }

    return json({ 
      success: true, 
      message: 'Subscription scheduled for cancellation at the end of the current billing period',
      current_period_end: (subscription as any).current_period_end ? new Date((subscription as any).current_period_end * 1000).toISOString() : null
    });
    
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
    const errorStatus = (err as any)?.status || 500;
    
    console.error('Subscription cancellation failed:', {
      error: err,
      message: errorMessage,
      status: errorStatus
    });
    
    throw error(errorStatus, errorMessage);
  }
};
