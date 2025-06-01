import { describe, it, expect, vi, beforeEach, beforeAll, afterEach } from 'vitest';

// 🔥 MUST be first!
vi.mock('$env/static/private', () => ({
  STRIPE_SECRET_KEY: 'sk_test_mock',
  STRIPE_WEBHOOK_SECRET: 'whsec_mock',
  SUPABASE_SERVICE_ROLE_KEY: 'mock_service_role_key',
}));

vi.mock('$env/static/public', () => ({
  PUBLIC_SUPABASE_URL: 'https://mock-supabase-url.supabase.co',
  PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_test_mock',
}));

import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import type { Stripe as StripeType } from 'stripe';

// Mock the Stripe types module
vi.mock('$lib/types/stripe', () => ({
  ...vi.importActual('$lib/types/stripe'),
  getInvoiceSubscription: vi.fn(() => 'sub_123'), // Mock the getInvoiceSubscription function
  getCustomerId: vi.fn(() => 'cus_123'), // Mock the getCustomerId function
  // Add other exports as needed
}));

// Set environment variables for any direct process.env usage
vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_mock');
vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_mock');
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'mock_service_role_key');
vi.stubEnv('PUBLIC_SUPABASE_URL', 'https://mock-supabase-url.supabase.co');
vi.stubEnv('PUBLIC_STRIPE_PUBLISHABLE_KEY', 'pk_test_mock');

// Define mock Stripe types
type MockStripe = {
  webhooks: {
    constructEvent: ReturnType<typeof vi.fn>;
  };
  subscriptions: {
    retrieve: ReturnType<typeof vi.fn>;
  };
  invoices: {
    retrieve: ReturnType<typeof vi.fn>;
  };
};

// Create a typed mock Stripe instance
const createMockStripe = (): MockStripe => ({
  webhooks: {
    constructEvent: vi.fn().mockImplementation((payload: string, signature: string, secret: string) => {
      if (secret !== 'whsec_mock') {
        throw new Error('Invalid signature');
      }
      return JSON.parse(payload);
    }),
  },
  subscriptions: {
    retrieve: vi.fn(),
  },
  invoices: {
    retrieve: vi.fn(),
  },
});

// Create a mock for the webhook handler
let stripeWebhook: any;
let mockStripe: MockStripe;
// Define the type for our chainable mock object
type ChainableMock = {
  [key: string]: any;
  _initChaining: () => ChainableMock;
};

// Create a proper chainable mock for Supabase
const createSupabaseMock = () => {
  // Define the mock methods we need to support
  const methods = ['select', 'insert', 'update', 'upsert', 'eq', 'single', 'maybeSingle', 'limit', 'from'];
  
  // Create the base mock object
  const mock: Record<string, any> = {};
  
  // Add all methods to the mock
  methods.forEach(method => {
    // Create a vi.fn() for each method
    mock[method] = vi.fn().mockImplementation((...args) => {
      console.log(`mockSupabase.${method} called with:`, args);
      
      // For terminal methods that should return data
      if (method === 'single' || method === 'maybeSingle') {
        return Promise.resolve({ data: null, error: null });
      }
      
      // For chainable methods, return the mock itself
      return mock;
    });
  });
  
  return mock;
};

// Create the main mock
const mockSupabase = createSupabaseMock();

// Ensure from() returns the same mock for chaining
mockSupabase.from.mockImplementation((table) => {
  console.log(`mockSupabase.from called with table: ${table}`);
  return mockSupabase;
});

// Mock the Supabase client module
vi.mock('@supabase/supabase-js', () => {
  return {
    createClient: vi.fn(() => mockSupabase),
  };
});

// Mock Stripe
beforeAll(async () => {
  // Mock the Stripe module
  mockStripe = createMockStripe();
  
  vi.mock('stripe', () => {
    const StripeMock = vi.fn(() => mockStripe);
    return { default: StripeMock }; // Proper ESM default export
  });

  // Import the webhook handler after all mocks are set up
  const module = await import('../../../../src/routes/api/webhooks/stripe/+server.js');
  stripeWebhook = module.POST;
});

// Reset mocks after each test
afterEach(() => {
  vi.clearAllMocks();
});

// Import test fixtures
import subscriptionCreatedEvent from '../../../../test/fixtures/stripe/customer.subscription.created.json';

describe('Stripe Webhook Handler', () => {
  let request: Request;
  const env = {
    STRIPE_WEBHOOK_SECRET: 'whsec_mock',
    STRIPE_SECRET_KEY: 'sk_test_mock',
    PUBLIC_SUPABASE_URL: 'https://mock-supabase-url.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'mock_service_role_key',
  };
  
  const context = {
    fetch: async () => new Response(),
  };

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    
    // Reset the Supabase mock
    Object.keys(mockSupabase).forEach(key => {
      if (vi.isMockFunction(mockSupabase[key])) {
        mockSupabase[key].mockClear();
        
        // Reset implementation based on method type
        if (key === 'single' || key === 'maybeSingle') {
          mockSupabase[key].mockResolvedValue({ data: null, error: null });
        } else if (key === 'from') {
          mockSupabase[key].mockImplementation((table) => {
            console.log(`mockSupabase.from called with table: ${table}`);
            return mockSupabase;
          });
        } else {
          mockSupabase[key].mockImplementation((...args) => {
            console.log(`mockSupabase.${key} called with:`, args);
            return mockSupabase;
          });
        }
      }
    });

    // Reset the Stripe mock implementation
    mockStripe.webhooks.constructEvent.mockImplementation((payload: string, signature: string, secret: string) => {
      if (secret !== 'whsec_mock') {
        throw new Error('Invalid signature');
      }
      return JSON.parse(payload);
    });
  });

  describe('POST /api/webhooks/stripe', () => {
    it('should return 400 if signature is missing', async () => {
      request = new Request('http://localhost/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify({ type: 'test.event' }),
        headers: { 'Content-Type': 'application/json' },
      });

      // The webhook handler throws a SvelteKit error, which we need to catch
      try {
        await stripeWebhook({ request, env } as any);
        // If we get here, the test should fail
        expect(true).toBe(false); // This should never be reached
      } catch (err: any) {
        // Verify the error has the correct status and message
        expect(err.status).toBe(400);
        expect(err.body.message).toBe('Missing Stripe signature');
      }
    });

    it('should return 400 for invalid signature', async () => {
      request = new Request('http://localhost/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify({ 
          id: 'evt_test',
          type: 'test.event',
          created: Math.floor(Date.now() / 1000), // Current timestamp in seconds
          data: { object: {} }
        }),
        headers: { 
          'Content-Type': 'application/json',
          'stripe-signature': 'invalid_signature'
        },
      });

      // Mock the constructEvent to throw an error for invalid signature
      mockStripe.webhooks.constructEvent.mockImplementationOnce(() => {
        throw new Error('Invalid signature');
      });

      // The webhook handler throws a SvelteKit error, which we need to catch
      try {
        await stripeWebhook({ request, env } as any);
        // If we get here, the test should fail
        expect(true).toBe(false); // This should never be reached
      } catch (err: any) {
        // Verify the error has the correct status and message
        expect(err.status).toBe(400);
        expect(err.body.message).toBe('Webhook Error: Invalid signature');
      }
    });

    it('should handle customer.subscription.created event', async () => {
      // Mock the subscription data with proper timestamps
      const now = Math.floor(Date.now() / 1000);
      const subscriptionData = {
        id: 'sub_123',
        customer: 'cus_123',
        status: 'active',
        current_period_end: now + 30 * 24 * 60 * 60, // 30 days from now in seconds
        created: now,
        items: {
          data: [{
            price: {
              id: 'price_123',
              product: 'prod_123',
            },
          }],
        },
        metadata: {
          user_id: 'user_123',
        },
      };

      // Mock the Stripe subscription retrieval
      mockStripe.subscriptions.retrieve.mockResolvedValue(subscriptionData);

      // Create a mock request with the subscription created event
      request = new Request('http://localhost/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify({
          id: 'evt_123',
          type: 'customer.subscription.created',
          created: now,
          data: {
            object: subscriptionData,
          },
        }),
        headers: { 
          'Content-Type': 'application/json',
          'stripe-signature': 'valid_signature',
        },
      });

      // Mock the webhook signature verification
      mockStripe.webhooks.constructEvent.mockImplementation((payload) => {
        return JSON.parse(payload);
      });

      // Set up per-test behavior for mockSupabase
      // Mock the organization lookup
      mockSupabase.maybeSingle.mockResolvedValueOnce({ 
        data: { id: 'org_123', stripe_customer_id: 'cus_123' }, 
        error: null 
      }).mockResolvedValueOnce({ 
        data: { id: 'org_123', stripe_customer_id: 'cus_123' }, 
        error: null 
      });
      
      // Mock the update operations
      mockSupabase.eq.mockImplementation(() => mockSupabase);
      mockSupabase.update.mockImplementation(() => mockSupabase);

      const response = await stripeWebhook({ request, env } as any);
      expect(response.status).toBe(200);
      
      // Verify the subscription was processed
      expect(mockSupabase.from).toHaveBeenCalledWith('organizations');
      expect(mockSupabase.update).toHaveBeenCalled();
    });

    it('should handle invoice.payment_succeeded event', async () => {
      const now = Math.floor(Date.now() / 1000);
      
      // Mock the invoice data with proper timestamps
      const invoiceData = {
        id: 'in_123',
        subscription: 'sub_123',
        customer: 'cus_123',
        status: 'paid',
        paid: true,
        amount_paid: 1000,
        currency: 'usd',
        created: now,
        billing_reason: 'unknown',
        lines: {
          data: [{
            price: {
              id: 'price_123',
              product: 'prod_123',
            },
          }],
        },
      };

      // Mock the subscription data
      const subscriptionData = {
        id: 'sub_123',
        customer: 'cus_123',
        status: 'active',
        current_period_end: now + 30 * 24 * 60 * 60, // 30 days from now
      };

      // Mock the Stripe API calls
      mockStripe.subscriptions.retrieve.mockResolvedValue(subscriptionData);
      mockStripe.invoices.retrieve.mockResolvedValue(invoiceData);

      // Create a mock request with the invoice.payment_succeeded event
      request = new Request('http://localhost/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify({
          id: 'evt_123',
          type: 'invoice.payment_succeeded',
          created: now,
          data: {
            object: invoiceData,
          },
        }),
        headers: { 
          'Content-Type': 'application/json',
          'stripe-signature': 'valid_signature',
        },
      });

      // Mock the webhook signature verification
      mockStripe.webhooks.constructEvent.mockImplementation((payload) => {
        return JSON.parse(payload);
      });

      // Set up per-test behavior for mockSupabase
      // Mock the organization lookup
      mockSupabase.maybeSingle.mockResolvedValueOnce({ 
        data: { id: 'org_123', stripe_customer_id: 'cus_123' }, 
        error: null 
      }).mockResolvedValueOnce({ 
        data: { id: 'org_123', stripe_customer_id: 'cus_123' }, 
        error: null 
      });
      
      // Mock the update operations
      mockSupabase.eq.mockImplementation(() => mockSupabase);
      mockSupabase.update.mockImplementation(() => mockSupabase);

      const response = await stripeWebhook({ request, env } as any);
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.received).toBe(true);
      
      // Verify the payment was processed
      expect(mockSupabase.from).toHaveBeenCalledWith('organizations');
      expect(mockSupabase.update).toHaveBeenCalled();
    });

    it('should handle customer.subscription.updated event', async () => {
      // Mock the subscription data with proper timestamps
      const now = Math.floor(Date.now() / 1000);
      const subscriptionData = {
        id: 'sub_123',
        customer: 'cus_123',
        status: 'active',
        current_period_end: now + 30 * 24 * 60 * 60, // 30 days from now in seconds
        created: now,
        items: {
          data: [{
            price: {
              id: 'price_456', // Different price ID to indicate an upgrade
              product: 'prod_456',
            },
          }],
        },
        metadata: {
          user_id: 'user_123',
        },
      };

      // Mock the Stripe subscription retrieval
      mockStripe.subscriptions.retrieve.mockResolvedValue(subscriptionData);

      // Create a mock request with the subscription updated event
      request = new Request('http://localhost/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify({
          id: 'evt_456',
          type: 'customer.subscription.updated',
          created: now,
          data: {
            object: subscriptionData,
          },
        }),
        headers: { 
          'Content-Type': 'application/json',
          'stripe-signature': 'valid_signature',
        },
      });

      // Mock the webhook signature verification
      mockStripe.webhooks.constructEvent.mockImplementation((payload) => {
        return JSON.parse(payload);
      });

      // Set up per-test behavior for mockSupabase
      // Mock the organization lookup
      mockSupabase.maybeSingle.mockResolvedValueOnce({ 
        data: { id: 'org_123', stripe_customer_id: 'cus_123' }, 
        error: null 
      }).mockResolvedValueOnce({ 
        data: { id: 'org_123', stripe_customer_id: 'cus_123' }, 
        error: null 
      });
      
      // Mock the update operations
      mockSupabase.eq.mockImplementation(() => mockSupabase);
      mockSupabase.update.mockImplementation(() => mockSupabase);

      const response = await stripeWebhook({ request, env } as any);
      expect(response.status).toBe(200);
      
      // Verify the subscription was processed
      expect(mockSupabase.from).toHaveBeenCalledWith('organizations');
      expect(mockSupabase.update).toHaveBeenCalled();
    });

    it('should handle customer.subscription.deleted event', async () => {
      // Mock the subscription data with proper timestamps
      const now = Math.floor(Date.now() / 1000);
      const subscriptionData = {
        id: 'sub_123',
        customer: 'cus_123',
        status: 'canceled',
        canceled_at: now,
        current_period_end: now + 30 * 24 * 60 * 60, // 30 days from now in seconds
        created: now,
        items: {
          data: [{
            price: {
              id: 'price_123',
              product: 'prod_123',
            },
          }],
        },
      };

      // Create a mock request with the subscription deleted event
      request = new Request('http://localhost/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify({
          id: 'evt_789',
          type: 'customer.subscription.deleted',
          created: now,
          data: {
            object: subscriptionData,
          },
        }),
        headers: { 
          'Content-Type': 'application/json',
          'stripe-signature': 'valid_signature',
        },
      });

      // Mock the webhook signature verification
      mockStripe.webhooks.constructEvent.mockImplementation((payload) => {
        return JSON.parse(payload);
      });

      // Set up per-test behavior for mockSupabase
      // Mock the organization lookup
      mockSupabase.maybeSingle.mockResolvedValueOnce({ 
        data: { id: 'org_123', stripe_customer_id: 'cus_123' }, 
        error: null 
      });
      
      // Mock the update operations
      mockSupabase.eq.mockImplementation(() => mockSupabase);
      mockSupabase.update.mockImplementation(() => mockSupabase);

      const response = await stripeWebhook({ request, env } as any);
      expect(response.status).toBe(200);
      
      // Verify the subscription was processed
      expect(mockSupabase.from).toHaveBeenCalledWith('organizations');
      expect(mockSupabase.update).toHaveBeenCalled();
    });

    it('should handle invoice.payment_failed event', async () => {
      const now = Math.floor(Date.now() / 1000);
      
      // Mock the invoice data with proper timestamps
      const invoiceData = {
        id: 'in_456',
        subscription: 'sub_123',
        customer: 'cus_123',
        status: 'open',
        paid: false,
        amount_paid: 0,
        currency: 'usd',
        created: now,
        billing_reason: 'subscription_cycle',
        lines: {
          data: [{
            price: {
              id: 'price_123',
              product: 'prod_123',
            },
          }],
        },
      };

      // Mock the subscription data
      const subscriptionData = {
        id: 'sub_123',
        customer: 'cus_123',
        status: 'past_due',
        current_period_end: now + 30 * 24 * 60 * 60, // 30 days from now
      };

      // Mock the Stripe API calls
      mockStripe.subscriptions.retrieve.mockResolvedValue(subscriptionData);
      mockStripe.invoices.retrieve.mockResolvedValue(invoiceData);

      // Create a mock request with the invoice.payment_failed event
      request = new Request('http://localhost/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify({
          id: 'evt_456',
          type: 'invoice.payment_failed',
          created: now,
          data: {
            object: invoiceData,
          },
        }),
        headers: { 
          'Content-Type': 'application/json',
          'stripe-signature': 'valid_signature',
        },
      });

      // Mock the webhook signature verification
      mockStripe.webhooks.constructEvent.mockImplementation((payload) => {
        return JSON.parse(payload);
      });

      // Set up per-test behavior for mockSupabase
      // Mock the organization lookup
      mockSupabase.maybeSingle.mockResolvedValueOnce({ 
        data: { id: 'org_123', stripe_customer_id: 'cus_123' }, 
        error: null 
      }).mockResolvedValueOnce({ 
        data: { id: 'org_123', stripe_customer_id: 'cus_123' }, 
        error: null 
      });
      
      // Mock the update operations
      mockSupabase.eq.mockImplementation(() => mockSupabase);
      mockSupabase.update.mockImplementation(() => mockSupabase);

      const response = await stripeWebhook({ request, env } as any);
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.received).toBe(true);
      
      // Verify the payment failure was processed
      expect(mockSupabase.from).toHaveBeenCalledWith('organizations');
      expect(mockSupabase.update).toHaveBeenCalled();
    });
  });
});
