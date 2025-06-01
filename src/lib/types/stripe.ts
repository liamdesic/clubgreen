import type { Stripe } from 'stripe';

// Extended types to handle Stripe's API responses more safely
type Expandable<T> = T | string;

// Base types that extend Stripe's types with common fields we expect
type BaseSubscription = Stripe.Subscription & {
  current_period_end?: number;
  metadata?: {
    upgraded_from_trial?: string;
    [key: string]: string | number | null | undefined;
  };
};

type BaseInvoice = Stripe.Invoice & {
  paid?: boolean;
  subscription?: string | Stripe.Subscription;
};

/**
 * Extended Subscription type that includes expanded objects safely
 */
export type ExpandedSubscription = Omit<BaseSubscription, 'latest_invoice' | 'customer'> & {
  latest_invoice?: Expandable<ExpandedInvoice>;
  customer: Expandable<Stripe.Customer>;
  // Add other expanded fields as needed
};

/**
 * Extended Invoice type that includes expanded objects safely
 */
export type ExpandedInvoice = Omit<BaseInvoice, 'payment_intent' | 'subscription' | 'charge'> & {
  payment_intent?: Expandable<Stripe.PaymentIntent>;
  subscription?: Expandable<Stripe.Subscription>;
  charge?: Expandable<Stripe.Charge>;
  // Add other expanded fields as needed
};

/**
 * Type guard to check if a value is a Stripe subscription
 */
export function isStripeSubscription(subscription: unknown): subscription is Stripe.Subscription {
  return (
    typeof subscription === 'object' &&
    subscription !== null &&
    'object' in subscription &&
    (subscription as Stripe.Subscription).object === 'subscription'
  );
}

/**
 * Type guard to check if a value is a Stripe invoice
 */
export function isStripeInvoice(invoice: unknown): invoice is Stripe.Invoice {
  return (
    typeof invoice === 'object' &&
    invoice !== null &&
    'object' in invoice &&
    (invoice as Stripe.Invoice).object === 'invoice'
  );
}

/**
 * Type guard to check if an object is a Stripe Customer
 */
export function isStripeCustomer(customer: string | Stripe.Customer | Stripe.DeletedCustomer): customer is Stripe.Customer {
  return (
    typeof customer === 'object' &&
    customer !== null &&
    'object' in customer &&
    (customer as Stripe.Customer).object === 'customer' &&
    !('deleted' in customer)
  );
}

/**
 * Safely gets the customer ID from a Stripe customer object
 */
export function getCustomerId(customer: string | Stripe.Customer | Stripe.DeletedCustomer | null | undefined): string | null {
  if (!customer) return null;
  if (typeof customer === 'string') return customer;
  if ('deleted' in customer) return null; // Deleted customer
  return customer.id;
}

/**
 * Safely gets the subscription ID from a Stripe subscription object
 */
export function getSubscriptionId(subscription: string | Stripe.Subscription | null | undefined): string | null {
  if (!subscription) return null;
  if (typeof subscription === 'string') return subscription;
  return subscription.id;
}

/**
 * Safely gets the subscription from an invoice
 */
export function getInvoiceSubscription(invoice: { subscription?: string | Stripe.Subscription }): string | Stripe.Subscription | null {
  return invoice.subscription || null;
}
