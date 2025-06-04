<svelte:head>
  <!-- Font Awesome -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
  <!-- TypeKit -->
  <link rel="stylesheet" href="https://use.typekit.net/kic0xlz.css">
</svelte:head>

<script lang="ts">
  import { invalidate } from '$app/navigation'
  import { onMount } from 'svelte'
  import type { LayoutData } from './$types'
  import { browser } from '$app/environment'
  import { supabase } from '$lib/supabaseClient'
  import '$lib/styles/base.css'
  import '$lib/styles/theme.css'
  import ToastHost from '$lib/ToastHost.svelte'
  import { page } from '$app/stores'
  import type { Session } from '@supabase/supabase-js'

  export let data: LayoutData

  let session: Session | null;
  $: session = data.session;

  onMount(() => {
    console.log('🔐 [AUTH] Setting up auth state change listener')
    
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: string, _session: Session | null) => {
      console.log('🔄 [AUTH] Auth state changed:', event)
      
      if (_session?.expires_at !== session?.expires_at) {
        console.log('⏰ [AUTH] Session expiry changed, invalidating...')
        invalidate('supabase:auth')
      }
    })

    return () => {
      console.log('🧹 [AUTH] Cleaning up auth state change listener')
      subscription.unsubscribe()
    }
  })
</script>

<slot />
<ToastHost />