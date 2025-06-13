<script>
  import '$lib/styles/base.css';
  import '$lib/styles/theme.css';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { supabase } from '$lib/supabaseClient';
  import { invalidate } from '$app/navigation';
  import { goto } from '$app/navigation';
  import ToastHost from '$lib/ToastHost.svelte';
  import DevPanel from '$lib/dev/DevPanel.svelte';
  import { authLogger } from '$lib/dev/logger';

  onMount(() => {
    authLogger.info('Initializing auth state listener');
    
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, session) => {
      authLogger.info(`Auth state changed: ${event}`, { 
        userId: session?.user?.id,
        email: session?.user?.email 
      });
      invalidate('supabase:auth');
    });

    return () => {
      authLogger.info('Cleaning up auth state listener');
      subscription.unsubscribe();
    };
  });
</script>

<div class="app">
  <main>
    <slot />
  </main>
  <ToastHost />
  <DevPanel />
</div>

<style>
  .app {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  main {
    flex: 1;
    display: flex;
    flex-direction: column;
    width: 100%;
  }
</style>
