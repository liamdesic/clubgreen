<script lang="ts">
  import { onMount } from 'svelte'
  import { invalidate } from '$app/navigation'
  import { browser } from '$app/environment'
  import { supabase } from '$lib/supabaseClient'
  import '$lib/styles/base.css'
  import '$lib/styles/theme.css'
  import ToastHost from '$lib/ToastHost.svelte'
  import { page } from '$app/stores'

  // Handle auth state changes
  onMount(() => {
    if (!browser) return

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      // Invalidate all pages when auth state changes
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        invalidate('supabase:auth')
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  })
</script>

<slot />
<ToastHost />