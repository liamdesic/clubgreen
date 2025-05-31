import Stripe from 'stripe';

export const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-05-28.basil',
  appInfo: {
    name: 'Ldrboard',
    version: '0.1.0',
  },
});
