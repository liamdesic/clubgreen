import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for agentic development workflow
 * Enables browser automation for testing and debugging
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter configuration for better logging
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['line']
  ],
  
  use: {
    // Base URL for testing
    baseURL: 'http://localhost:5173',
    
    // Collect trace on failure for debugging
    trace: 'on-first-retry',
    
    // Screenshot on failure
    screenshot: 'only-on-failure',
    
    // Video recording
    video: 'retain-on-failure',
    
    // Extended timeout for slow operations
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Enable dev tools for debugging
        launchOptions: {
          devtools: true,
          slowMo: process.env.SLOW_MO ? parseInt(process.env.SLOW_MO) : 0,
        }
      },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  // Web server configuration for development
  webServer: {
    command: 'npm run build && npm run preview',
    port: 4173,
    reuseExistingServer: !process.env.CI,
  },
});