<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient';
  import Button from '$lib/components/Button.svelte';
  import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
  
  let error = '';
  let supabaseStatus = 'Checking...';
  let envVars = {
    supabaseUrl: '❓',
    supabaseAnonKey: '❓'
  };
  
  onMount(() => {
    // Check if supabase is null
    if (supabase === null) {
      supabaseStatus = '❌ Supabase client is null';
      error = 'Supabase client is null. This might be because we are server-side rendering or environment variables are missing.';
    } else {
      supabaseStatus = '✅ Supabase client initialized';
    }
    
    // Check environment variables
    try {
      envVars = {
        supabaseUrl: PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing',
        supabaseAnonKey: PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'
      };
    } catch (e) {
      error = `Error checking env vars: ${e.message}`;
    }
  });
  
  async function testSupabaseConnection() {
    if (!supabase) {
      error = 'Cannot test connection: Supabase client is null';
      return;
    }
    
    try {
      const { data, error: apiError } = await supabase.from('events').select('id').limit(1);
      
      if (apiError) {
        error = `API Error: ${apiError.message}`;
      } else {
        error = '';
        supabaseStatus = `✅ Connection successful! Found ${data?.length || 0} events.`;
      }
    } catch (e) {
      error = `Exception: ${e.message}`;
    }
  }
</script>

<div class="test-page">
  <h1>Debugging Page</h1>
  
  <div class="card">
    <h2>Supabase Client Status</h2>
    <p class="status">{supabaseStatus}</p>
    
    <h3>Environment Variables</h3>
    <ul>
      <li>PUBLIC_SUPABASE_URL: {envVars.supabaseUrl}</li>
      <li>PUBLIC_SUPABASE_ANON_KEY: {envVars.supabaseAnonKey}</li>
    </ul>
    
    {#if error}
      <div class="error">
        <p>{error}</p>
      </div>
    {/if}
    
    <Button on:click={testSupabaseConnection}>Test Supabase Connection</Button>
  </div>
  
  <div class="card">
    <h2>Navigation Test</h2>
    <p>Try these links to see if navigation works:</p>
    <ul>
      <li><a href="/">Home</a></li>
      <li><a href="/login">Login Page</a></li>
    </ul>
  </div>
</div>

<style>
  .test-page {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
    font-family: system-ui, -apple-system, sans-serif;
  }
  
  h1 {
    color: #333;
    margin-bottom: 2rem;
  }
  
  .card {
    background: white;
    border-radius: 8px;
    padding: 1.5rem;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    margin-bottom: 2rem;
  }
  
  h2 {
    margin-top: 0;
    color: #333;
  }
  
  .status {
    font-size: 1.2rem;
    font-weight: bold;
  }
  
  .error {
    background: #fff5f5;
    border-left: 4px solid #f56565;
    padding: 1rem;
    margin: 1rem 0;
    color: #c53030;
  }
  
  ul {
    padding-left: 1.5rem;
  }
  
  li {
    margin-bottom: 0.5rem;
  }
</style>
