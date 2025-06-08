import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { stripe } from '$lib/server/stripe/client';
import { STRIPE_PRICE_ID } from '$env/static/private';
import type Stripe from 'stripe';
import { generateUniqueOrgLeaderboardCode } from '$lib/utils/codeUtils';
import { 
  organizationFormSchema, 
  type OrganizationFormData, 
  type FormErrorResponse 
} from '$lib/validations';

// Define form values type
type FormValues = OrganizationFormData;

// Organization settings type for internal use
type OrganizationSettings = {
  logo_url?: string | null;
  [key: string]: unknown;
};
