import { describe, it, expect, vi, beforeEach, beforeAll, afterEach } from 'vitest';

// 🔥 MUST be first!
vi.mock('$env/static/public', () => ({
  PUBLIC_SUPABASE_URL: 'https://mock-supabase-url.supabase.co',
  PUBLIC_SUPABASE_ANON_KEY: 'mock-anon-key',
}));

vi.mock('$env/static/private', () => ({
  SUPABASE_SERVICE_ROLE_KEY: 'mock-service-role-key',
}));

import { redirect } from '@sveltejs/kit';
import type { SupabaseClient, User, Session } from '@supabase/supabase-js';

// Mock the createServerClient function from @supabase/ssr
vi.mock('@supabase/ssr', () => {
  return {
    createServerClient: vi.fn(() => mockSupabaseClient),
  };
});

// Define types for our mocks
type MockSupabaseAuth = {
  getUser: ReturnType<typeof vi.fn>;
  getSession: ReturnType<typeof vi.fn>;
  signInWithOtp: ReturnType<typeof vi.fn>;
  signOut: ReturnType<typeof vi.fn>;
  exchangeCodeForSession: ReturnType<typeof vi.fn>;
};

type MockSupabaseClient = {
  auth: MockSupabaseAuth;
  from: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
};

// Create mock user and session
const mockUser: User = {
  id: 'mock-user-id',
  email: 'test@example.com',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString(),
};

const mockSession: Session = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: 'bearer',
  user: mockUser,
};

// Create mock Supabase client
const mockSupabaseAuth: MockSupabaseAuth = {
  getUser: vi.fn(),
  getSession: vi.fn(),
  signInWithOtp: vi.fn(),
  signOut: vi.fn(),
  exchangeCodeForSession: vi.fn(),
};

const mockSupabaseClient: MockSupabaseClient = {
  auth: mockSupabaseAuth,
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn(),
  maybeSingle: vi.fn(),
  update: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
};

// Create mock event and cookies
const createMockEvent = (overrides = {}) => {
  const cookies = new Map();
  
  return {
    url: new URL('http://localhost'),
    request: new Request('http://localhost'),
    cookies: {
      get: vi.fn((key) => cookies.get(key)),
      set: vi.fn((key, value) => cookies.set(key, value)),
      delete: vi.fn((key) => cookies.delete(key)),
      getAll: vi.fn(() => Array.from(cookies.entries()).map(([name, value]) => ({ name, value }))),
    },
    locals: {},
    ...overrides,
  };
};

// Import the handle function after mocks are set up
let handle: any;

beforeAll(async () => {
  const module = await import('../../../src/hooks.server');
  handle = module.handle;
});

describe('Supabase Auth Tests', () => {
  let event: ReturnType<typeof createMockEvent>;
  
  beforeEach(() => {
    vi.clearAllMocks();
    event = createMockEvent();
    
    // Reset auth mocks to default successful responses
    mockSupabaseAuth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });
    
    mockSupabaseAuth.getSession.mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });
    
    mockSupabaseAuth.exchangeCodeForSession.mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });
  });
  
  describe('hooks.server.ts handle function', () => {
    it('should attach supabase client to event.locals', async () => {
      const mockResolve = vi.fn().mockResolvedValue(new Response());
      
      await handle({ event, resolve: mockResolve });
      
      expect(event.locals.supabase).toBeDefined();
      expect(mockResolve).toHaveBeenCalledWith(event);
    });
    
    it('should provide getSession method to event.locals', async () => {
      const mockResolve = vi.fn().mockResolvedValue(new Response());
      
      await handle({ event, resolve: mockResolve });
      
      expect(typeof event.locals.getSession).toBe('function');
    });
    
    it('getSession should return session and user when auth is successful', async () => {
      const mockResolve = vi.fn().mockResolvedValue(new Response());
      
      await handle({ event, resolve: mockResolve });
      
      const result = await event.locals.getSession();
      
      expect(result).toEqual({
        session: mockSession,
        user: mockUser,
      });
      expect(mockSupabaseAuth.getUser).toHaveBeenCalled();
      expect(mockSupabaseAuth.getSession).toHaveBeenCalled();
    });
    
    it('getSession should return null session and user when getUser fails', async () => {
      const mockResolve = vi.fn().mockResolvedValue(new Response());
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('User not found'),
      });
      
      await handle({ event, resolve: mockResolve });
      
      const result = await event.locals.getSession();
      
      expect(result).toEqual({
        session: null,
        user: null,
      });
      expect(mockSupabaseAuth.getUser).toHaveBeenCalled();
      // getSession shouldn't be called if getUser fails
      expect(mockSupabaseAuth.getSession).not.toHaveBeenCalled();
    });
    
    it('getSession should return null session and user when getSession fails', async () => {
      const mockResolve = vi.fn().mockResolvedValue(new Response());
      mockSupabaseAuth.getSession.mockResolvedValue({
        data: { session: null },
        error: new Error('Session not found'),
      });
      
      await handle({ event, resolve: mockResolve });
      
      const result = await event.locals.getSession();
      
      expect(result).toEqual({
        session: null,
        user: null,
      });
      expect(mockSupabaseAuth.getUser).toHaveBeenCalled();
      expect(mockSupabaseAuth.getSession).toHaveBeenCalled();
    });
  });
  
  describe('auth/callback handler', () => {
    let callbackModule: any;
    
    beforeAll(async () => {
      callbackModule = await import('../../../src/routes/auth/callback/+page.server');
    });
    
    it('should redirect to dashboard when session already exists', async () => {
      const url = new URL('http://localhost/auth/callback');
      const locals = {
        supabase: mockSupabaseClient,
        getSession: vi.fn().mockResolvedValue({
          session: mockSession,
          user: mockUser,
        }),
      };
      
      try {
        await callbackModule.load({ url, locals, cookies: event.cookies, request: event.request });
        // Should not reach here due to redirect
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toEqual(redirect(303, '/dashboard'));
      }
      
      expect(locals.getSession).toHaveBeenCalled();
      // exchangeCodeForSession shouldn't be called if session exists
      expect(mockSupabaseAuth.exchangeCodeForSession).not.toHaveBeenCalled();
    });
    
    it('should exchange code for session when code is provided', async () => {
      const url = new URL('http://localhost/auth/callback?code=test-code');
      const locals = {
        supabase: mockSupabaseClient,
        getSession: vi.fn()
          .mockResolvedValueOnce({ session: null, user: null }) // First call returns no session
          .mockResolvedValueOnce({ session: mockSession, user: mockUser }), // Second call after exchange returns session
      };
      
      try {
        await callbackModule.load({ url, locals, cookies: event.cookies, request: event.request });
        // Should not reach here due to redirect
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toEqual(redirect(303, '/dashboard'));
      }
      
      expect(locals.getSession).toHaveBeenCalledTimes(2);
      expect(mockSupabaseAuth.exchangeCodeForSession).toHaveBeenCalledWith('test-code');
    });
    
    it('should redirect to onboarding for signup', async () => {
      const url = new URL('http://localhost/auth/callback?code=test-code&type=signup');
      const locals = {
        supabase: mockSupabaseClient,
        getSession: vi.fn()
          .mockResolvedValueOnce({ session: null, user: null }) // First call returns no session
          .mockResolvedValueOnce({ session: mockSession, user: mockUser }), // Second call after exchange returns session
      };
      
      try {
        await callbackModule.load({ url, locals, cookies: event.cookies, request: event.request });
        // Should not reach here due to redirect
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toEqual(redirect(303, '/onboarding'));
      }
      
      expect(locals.getSession).toHaveBeenCalledTimes(2);
      expect(mockSupabaseAuth.exchangeCodeForSession).toHaveBeenCalledWith('test-code');
    });
    
    it('should redirect to login with error when code exchange fails', async () => {
      const url = new URL('http://localhost/auth/callback?code=invalid-code');
      const locals = {
        supabase: mockSupabaseClient,
        getSession: vi.fn().mockResolvedValue({ session: null, user: null }),
      };
      
      mockSupabaseAuth.exchangeCodeForSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Invalid code', name: 'AuthError', status: 400 },
      });
      
      try {
        await callbackModule.load({ url, locals, cookies: event.cookies, request: event.request });
        // Should not reach here due to redirect
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toEqual(redirect(303, '/login?error=Invalid%20code'));
      }
      
      expect(locals.getSession).toHaveBeenCalledTimes(1);
      expect(mockSupabaseAuth.exchangeCodeForSession).toHaveBeenCalledWith('invalid-code');
    });
    
    it('should redirect to login with error when no code is provided', async () => {
      const url = new URL('http://localhost/auth/callback');
      const locals = {
        supabase: mockSupabaseClient,
        getSession: vi.fn().mockResolvedValue({ session: null, user: null }),
      };
      
      try {
        await callbackModule.load({ url, locals, cookies: event.cookies, request: event.request });
        // Should not reach here due to redirect
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toEqual(redirect(303, '/login?error=missing_code'));
      }
      
      expect(locals.getSession).toHaveBeenCalledTimes(1);
      expect(mockSupabaseAuth.exchangeCodeForSession).not.toHaveBeenCalled();
    });
  });
});
