import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { stripe } from '$lib/server/stripe/client';
import { STRIPE_PRICE_ID } from '$env/static/private';
import type Stripe from 'stripe';
import { generateUniqueOrgLeaderboardCode } from '$lib/utils/codeUtils';
import type { Database } from '$lib/database.types';
import { organizationFormSchema } from '$lib/validations/organizationForm';
import type { OrganizationFormData } from '$lib/validations/organizationForm';
import type { FormErrorResponse } from '$lib/validations/errorSchemas';
import { organizationSettingsSchema } from '$lib/validations/organizationSettings';
import { z } from 'zod';

// Use types from database.types and validations.ts
type FormValues = OrganizationFormData;
type OrganizationSettings = z.infer<typeof organizationSettingsSchema>;

export const load: PageServerLoad = async ({ locals, url }) => {
  const { session, supabase } = locals;
  
  if (!session?.user) {
    throw redirect(302, `/login?redirectTo=${encodeURIComponent(url.pathname)}`);
  }

  // Check if user already has an organization
  const { data: existingOrg } = await supabase
    .from('organizations')
    .select('*')
    .eq('owner_id', session.user.id)
    .maybeSingle();

  // Only redirect if org exists AND has completed stripe setup
  if (existingOrg && existingOrg.stripe_customer_id) {
    throw redirect(302, '/dashboard');
  }

  const redirectTo = url.searchParams.get('redirectTo') || '/dashboard';

  return {
    user: session.user,
    org: null,
    redirectTo
  };
};

export const actions: Actions = {
  default: async ({ request, locals }) => {
    const { session, supabase } = locals;
    
    if (!session?.user) {
      return fail(401, { message: 'Unauthorized' });
    }

    try {
      const formData = await request.formData();
      const organizationData = {
        name: formData.get('name') as string,
        slug: formData.get('slug') as string,
        logoUrl: formData.get('logoUrl') as string || null
      };

      // Validate the form data
      const result = organizationFormSchema.safeParse(organizationData);
      if (!result.success) {
        return fail(400, {
          errors: result.error.flatten().fieldErrors,
          formValues: organizationData
        });
      }

      const validatedData = result.data;

      // Check if slug is already taken
      const { data: existingSlug } = await supabase
        .from('organizations')
        .select('slug')
        .eq('slug', validatedData.slug)
        .single();

      if (existingSlug) {
        return fail(400, {
          errors: { slug: ['This URL is already taken. Please choose another.'] },
          formValues: organizationData
        });
      }

      // Create organization with additional required fields
      const { data: organization, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: validatedData.name,
          slug: validatedData.slug,
          logo_url: validatedData.logoUrl,
          owner_id: session.user.id,
          leaderboard_code: await generateUniqueOrgLeaderboardCode(supabase),
          settings: {
            theme: {
              primary_color: '#8B45FF',
              secondary_color: '#FF6B35',
              background_color: '#0f0f1a',
              text_color: '#ffffff'
            },
            branding: {
              show_logo: true,
              show_org_name: true
            }
          }
        })
        .select()
        .single();

      if (orgError) {
        console.error('Organization creation error:', orgError);
        return fail(500, {
          message: 'Failed to create organization. Please try again.',
          formValues: organizationData
        });
      }

      // Create Stripe customer and subscription
      try {
        const customer = await stripe.customers.create({
          email: session.user.email!,
          metadata: {
            user_id: session.user.id,
            organization_id: organization.id
          }
        });

        const subscription = await stripe.subscriptions.create({
          customer: customer.id,
          items: [{ price: STRIPE_PRICE_ID }],
          trial_period_days: 14,
          metadata: {
            user_id: session.user.id,
            organization_id: organization.id
          }
        });

        // Update organization with Stripe data
        await supabase
          .from('organizations')
          .update({
            stripe_customer_id: customer.id,
            stripe_subscription_id: subscription.id
          })
          .eq('id', organization.id);

      } catch (stripeError) {
        console.error('Stripe setup error:', stripeError);
        // Don't fail the whole process if Stripe fails
      }

      return {
        success: true,
        redirectTo: '/dashboard'
      };

    } catch (error) {
      console.error('Onboarding error:', error);
      return fail(500, {
        message: 'An unexpected error occurred. Please try again.'
      });
    }
  }
};
