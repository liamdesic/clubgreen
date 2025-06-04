import { redirect, fail } from '@sveltejs/kit';
import { z } from 'zod';
import type { PageServerLoad, Actions } from './$types';
import { stripe } from '$lib/server/stripe/client';
import { STRIPE_PRICE_ID } from '$env/static/private';
import type Stripe from 'stripe';

// Define organization settings type
type OrganizationSettings = {
  logo_url?: string | null;
  [key: string]: any;
};

// Define organization type
type Organization = {
  id: string;
  name: string;
  slug: string;
  stripe_customer_id: string | null;
  settings_json: OrganizationSettings | null;
};

// Define form values type
type FormValues = {
  name: string;
  slug: string;
  logoUrl: string;
};

// Define the organization schema for validation
const organizationSchema = z.object({
  name: z.string().min(2, { message: 'Organization name must be at least 2 characters' }).max(50, { message: 'Organization name must be less than 50 characters' }),
  slug: z.string().min(2, { message: 'URL must be at least 2 characters' })
    .max(30, { message: 'URL must be less than 30 characters' })
    .regex(/^[a-z0-9-]+$/, { message: 'URL can only contain lowercase letters, numbers, and hyphens' }),
  logoUrl: z.string().optional()
});

export const load: PageServerLoad = async ({ url, locals }) => {
  console.log('🔍 [onboarding] Starting onboarding load...');
  
  // Get the authenticated user using our centralized getUser method
  const user = await locals.getUser();
  
  if (!user) {
    console.error('❌ [onboarding] No authenticated user');
    // Add redirect URL to bring the user back to onboarding after login
    const errorMessage = 'Please log in to access the onboarding page';
    throw redirect(303, `/login?redirectTo=${encodeURIComponent(url.pathname)}&error=${encodeURIComponent(errorMessage)}`);
  }
  
  console.log('🔑 [onboarding] User authenticated:', { 
    userId: user.id, 
    email: user.email 
  });

  // Check if user already has an organization with a Stripe customer
  console.log('🔍 [onboarding] Checking if user already has organizations');
  const { data: org, error: orgError } = await locals.supabase
    .from('organizations')
    .select('id, name, slug, stripe_customer_id, settings_json')
    .eq('owner_id', user.id)
    .maybeSingle();

  if (orgError) {
    console.error('❌ [onboarding] Error checking organizations:', orgError);
  } else if (org && org.stripe_customer_id) {
    // If user already has an organization with Stripe setup, redirect to dashboard
    console.log('ℹ️ [onboarding] User already has completed onboarding, redirecting to dashboard');
    throw redirect(303, '/dashboard');
  }

  // Get redirectTo parameter to use after onboarding completion
  const redirectTo = url.searchParams.get('redirectTo') || '/dashboard';
  
  // Pre-fill values if org exists but doesn't have Stripe customer
  let logoUrl = '';
  if (org?.settings_json && typeof org.settings_json === 'object' && !Array.isArray(org.settings_json)) {
    const settings = org.settings_json as Record<string, any>;
    logoUrl = settings.logo_url || '';
  }
  
  const formValues: FormValues = org && !org.stripe_customer_id ? {
    name: org.name,
    slug: org.slug,
    logoUrl
  } : {
    name: '',
    slug: '',
    logoUrl: ''
  };

  return {
    user,
    org, // May be null if no org exists yet, or may have org without stripe_customer_id
    redirectTo,
    formValues,
    errors: {}
  }
};

export const actions: Actions = {
  default: async ({ request, locals, url }) => {
    // Get the authenticated user
    const user = await locals.getUser();
    if (!user) {
      return fail(401, { message: 'Unauthorized' });
    }
    
    // Parse form data
    const formData = Object.fromEntries(await request.formData());
    const result = organizationSchema.safeParse(formData);
    
    // Return validation errors if any
    if (!result.success) {
      return fail(400, { 
        values: formData,
        errors: result.error.flatten().fieldErrors
      });
    }
    
    const validData = result.data;
    
    try {
      // Check if slug is already taken
      const { data: existingOrg, error: slugCheckError } = await locals.supabase
        .from('organizations')
        .select('id')
        .eq('slug', validData.slug)
        .maybeSingle();
      
      if (slugCheckError) {
        console.error('Error checking slug availability:', slugCheckError);
        return fail(500, { 
          values: formData,
          errors: { slug: ['Failed to check slug availability. Please try again.'] },
          message: 'Failed to check slug availability. Please try again.'
        });
      }
      
      if (existingOrg) {
        return fail(400, { 
          values: formData,
          errors: { slug: ['This URL is already taken. Please choose another.'] }
        });
      }
      
      // Create organization in Supabase
      const { data: orgData, error: orgError } = await locals.supabase
        .from('organizations')
        .insert([
          { 
            name: validData.name,
            slug: validData.slug,
            owner_id: user.id,
            settings_json: {
              logo_url: validData.logoUrl || null
            },
            payment_up_to_date: false
          }
        ])
        .select()
        .single();
      
      if (orgError) {
        console.error('Error creating organization:', orgError);
        return fail(500, { 
          values: formData,
          message: 'Failed to create organization. Please try again.'
        });
      }
      
      // Start the free trial using the organization data
      try {
        // Get redirectTo parameter or default to dashboard
        const redirectTo = url.searchParams.get('redirectTo') || '/dashboard';
        
        if (!STRIPE_PRICE_ID) {
          console.error('STRIPE_PRICE_ID is not set in environment variables');
          return fail(500, { 
            values: formData,
            message: 'Server configuration error. Please contact support.'
          });
        }
        
        // Create a Stripe customer for the organization
        const customer = await stripe.customers.create({
          email: user.email,
          name: validData.name,
          metadata: {
            organizationId: orgData.id,
            userId: user.id
          }
        });
        
        console.log('Created Stripe customer:', customer.id);
        
        // Create a trial subscription
        const subscription = await stripe.subscriptions.create({
          customer: customer.id,
          items: [{ price: STRIPE_PRICE_ID }],
          trial_period_days: 14,
          metadata: {
            organizationId: orgData.id
          }
        }) as Stripe.Subscription;
        
        console.log('Created trial subscription:', subscription.id);
        
        // Update organization with Stripe customer and subscription IDs
        const { error: updateError } = await locals.supabase
          .from('organizations')
          .update({
            stripe_customer_id: customer.id,
            stripe_subscription_id: subscription.id,
            subscription_status: subscription.status,
            // Ensure these match Supabase timestamptz column types
            current_period_end: 'current_period_end' in subscription && subscription.current_period_end
              ? new Date((subscription.current_period_end as number) * 1000).toISOString()
              : null,
            trial_ends_at: 'trial_end' in subscription && subscription.trial_end
              ? new Date((subscription.trial_end as number) * 1000).toISOString()
              : null,
            payment_up_to_date: true
          })
          .eq('id', orgData.id);
        
        if (updateError) {
          console.error('Error updating organization with Stripe data:', updateError);
          // We don't fail here since the customer and subscription were created successfully
          // The webhook will eventually sync this data
        }
        
        // Redirect to dashboard or the original redirect URL
        throw redirect(303, redirectTo);
      } catch (error) {
        console.error('Error in trial creation:', error);
        return fail(500, { 
          values: formData,
          message: `Organization created, but we couldn't start your trial. Please contact support.`
        });
      }
      
    } catch (error) {
      console.error('Error in organization creation:', error);
      return fail(500, { 
        values: formData,
        message: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    }
  }
};
