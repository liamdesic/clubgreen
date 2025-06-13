import { test, expect, type Page } from '@playwright/test';

/**
 * Browser automation tests for agentic development workflow
 * These tests can be run by AI agents to verify functionality
 */

// Helper functions for common actions
async function login(page: Page, email = 'test@example.com', password = 'password123') {
  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
}

async function navigateToDashboard(page: Page) {
  await page.goto('/dashboard');
  await expect(page).toHaveTitle(/Dashboard/);
}

test.describe('Basic Navigation Flow', () => {
  test('can access login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h1')).toContainText(/log in|sign up/i);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('can access onboarding page', async ({ page }) => {
    await page.goto('/onboarding');
    await expect(page.locator('h1')).toContainText(/welcome/i);
    await expect(page.locator('input[name="name"]')).toBeVisible();
  });

  test('dashboard requires authentication', async ({ page }) => {
    await page.goto('/dashboard');
    // Should redirect to login
    await expect(page).toHaveURL(/.*\/login.*/);
  });
});

test.describe('Console Logging Verification', () => {
  test('can capture console logs', async ({ page }) => {
    const logs: string[] = [];
    
    page.on('console', msg => {
      logs.push(`${msg.type()}: ${msg.text()}`);
    });

    await page.goto('/');
    
    // Wait for initial logs
    await page.waitForTimeout(2000);
    
    // Check that we're capturing logs
    expect(logs.length).toBeGreaterThan(0);
    
    // Log the captured console output for AI analysis
    console.log('Captured console logs:', logs);
  });

  test('can interact with dev panel', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Try to open dev panel with keyboard shortcut
    await page.keyboard.press('Control+Shift+D');
    
    // Check if dev panel appears (in development mode)
    const devPanel = page.locator('.dev-panel');
    const devToggle = page.locator('.dev-toggle');
    
    // Either dev panel should be visible or toggle button should be present
    const hasDevTools = await devPanel.isVisible() || await devToggle.isVisible();
    
    if (hasDevTools) {
      console.log('Dev panel is available for debugging');
    } else {
      console.log('Dev panel not available (might be production build)');
    }
  });
});

test.describe('Form Interactions', () => {
  test('login form validation works', async ({ page }) => {
    await page.goto('/login');
    
    // Try submitting empty form
    await page.click('button[type="submit"]');
    
    // Should show validation errors
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    
    // Check that form doesn't submit with invalid data
    await expect(emailInput).toBeFocused();
  });

  test('onboarding form has proper validation', async ({ page }) => {
    await page.goto('/onboarding');
    
    // Fill in organization name and check slug generation
    await page.fill('input[name="name"]', 'Test Organization');
    
    // Check that slug is auto-generated
    const slugInput = page.locator('input[name="slug"]');
    await expect(slugInput).toHaveValue(/test-organization/);
  });
});

test.describe('Error Handling', () => {
  test('can capture JavaScript errors', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('pageerror', error => {
      errors.push(error.message);
    });

    await page.goto('/');
    
    // Navigate through key pages to check for errors
    const pages = ['/login', '/onboarding'];
    
    for (const pagePath of pages) {
      await page.goto(pagePath);
      await page.waitForTimeout(1000);
    }
    
    // Log any errors for AI analysis
    if (errors.length > 0) {
      console.log('JavaScript errors detected:', errors);
    } else {
      console.log('No JavaScript errors detected in basic navigation');
    }
    
    expect(errors.length).toBe(0);
  });
});

test.describe('Network Requests', () => {
  test('can monitor API calls', async ({ page }) => {
    const apiCalls: string[] = [];
    
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        apiCalls.push(`${request.method()} ${request.url()}`);
      }
    });

    await page.goto('/dashboard');
    await page.waitForTimeout(3000);
    
    // Log API calls for AI analysis
    console.log('API calls made:', apiCalls);
  });
});

// Export helper functions for use by AI agents
export { login, navigateToDashboard };