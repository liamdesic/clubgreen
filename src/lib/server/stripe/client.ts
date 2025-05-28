import Stripe from 'stripe';
import { env } from '$env/dynamic/private';

export const stripe = new Stripe(env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-04-10',
  appInfo: {
    name: 'Ldrboard',
    version: '0.1.0',
  },
});
