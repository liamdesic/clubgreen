import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  console.log('🔍 [settings] Starting settings page load...');
  
  // User and organization are already verified by +layout.server.ts
  // We can access the user directly from locals
  // We can safely use non-null assertion (!) because layout.server.ts guarantees user exists
  const user = locals.user!;
  
  console.log('🔑 [settings] User from layout:', { 
    userId: user.id, 
    email: user.email 
  });

  // No need to return data here as the client will fetch what it needs
  return {
    user: {
      id: user.id,
      email: user.email
    }
  };
};
