import type Stripe from 'stripe';

// Extended Stripe types for webhook processing
export interface ExpandedSubscription extends Stripe.Subscription {
  latest_invoice?: ExpandedInvoice;
}

export interface ExpandedInvoice extends Stripe.Invoice {
  subscription?: string | Stripe.Subscription;
  customer: string | Stripe.Customer;
  payment_intent?: string | Stripe.PaymentIntent;
  paid?: boolean;
}

// Utility functions for safely extracting data from Stripe objects
export function getInvoiceSubscription(invoice: ExpandedInvoice): string | Stripe.Subscription | null {
  if (!invoice.subscription) return null;
  return invoice.subscription;
}

export function getCustomerId(customer: string | Stripe.Customer | Stripe.DeletedCustomer | null | undefined): string | null {
  if (!customer) return null;
  if (typeof customer === 'string') return customer;
  
  // Handle both Customer and DeletedCustomer objects
  const customerObj = customer as { id?: string };
  return customerObj?.id || null;
}