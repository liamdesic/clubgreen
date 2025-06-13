import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getLiveVisibleEventsForOrg } from '$lib/utils/eventUtils';

export const load: PageServerLoad = async ({ params, parent, locals: { supabase } }) => {
  try {
    // Get parent data (organization)
    const { organization } = await parent();
    
    // Validate the org leaderboard code
    if (!validateOrgLeaderboardCode(organization, params.org_code)) {
      console.error('Invalid org leaderboard code:', params.org_code);
      throw redirect(303, '/');
    }
    
    // Get live events for the organization
    const liveEvents = await getLiveVisibleEventsForOrg(organization.id);
    
    return {
      organization,
      liveEvents,
      orgCode: params.org_code
    };
  } catch (error) {
    console.error('Error in org leaderboard page load:', error);
    throw redirect(303, '/');
  }
};

/**
 * Validates if an org leaderboard code belongs to the organization
 */
function validateOrgLeaderboardCode(organization: any, code: string): boolean {
  const codes = organization.org_leaderboard_codes;
  if (!Array.isArray(codes)) return false;
  
  // org_leaderboard_codes is an array of objects with { code: string }
  return codes.some(codeObj => 
    typeof codeObj === 'object' && 
    codeObj !== null && 
    'code' in codeObj && 
    codeObj.code === code
  );
}