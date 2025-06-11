<script lang="ts">
  import type { Organization } from '$lib/validations';
  
  export let data: {
    organization: Organization;
  };
</script>

<slot /> 