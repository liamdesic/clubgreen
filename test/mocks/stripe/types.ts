import type { Stripe } from 'stripe';

// Mock types for Stripe objects
export type ExpandedSubscription = Stripe.Subscription & {
  latest_invoice?: string | { id: string };
  customer: string | { id: string };
};

export type ExpandedInvoice = Stripe.Invoice & {
  payment_intent?: string | { id: string };
  subscription?: string | { id: string };
  charge?: string | { id: string };
};

// Mock utility functions
export function getCustomerId(customer: string | { id: string } | null | undefined): string | null {
  if (!customer) return null;
  if (typeof customer === 'string') return customer;
  return customer.id || null;
}

export function getSubscriptionId(subscription: string | { id: string } | null | undefined): string | null {
  if (!subscription) return null;
  if (typeof subscription === 'string') return subscription;
  return subscription.id || null;
}

export function getInvoiceSubscription(invoice: { subscription?: string | { id: string } }): string | { id: string } | null {
  return invoice.subscription || null;
}
