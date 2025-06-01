import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/svelte';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with Jest DOM matchers
Object.entries(matchers).forEach(([matcherName, matcher]) => {
  // @ts-ignore
  expect.extend({ [matcherName]: matcher });
});

// Run cleanup after each test case
afterEach(() => {
  cleanup();
});

// Mock environment variables
vi.stubEnv('VITE_SUPABASE_URL', 'https://mock-supabase-url.supabase.co');
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'mock-supabase-anon-key');
vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_mock_stripe_secret_key');
vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_mock_webhook_secret');
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'mock-service-role-key');
vi.stubEnv('PUBLIC_STRIPE_PUBLISHABLE_KEY', 'pk_test_mock_publishable_key');
