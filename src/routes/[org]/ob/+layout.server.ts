import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ params, locals: { supabase } }) => {
  try {
    // Get the organization from the slug
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('slug', params.org)
      .single();

    if (orgError || !orgData) {
      console.error('Organization not found:', orgError);
      throw new Error('Organization not found');
    }

    return {
      organization: orgData
    };
  } catch (error) {
    console.error('Error in org leaderboard layout load:', error);
    throw error;
  }
};