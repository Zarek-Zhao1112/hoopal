import { getNbaTeam } from '../../../../data/nba-teams.js';

const logos = import.meta.glob('../../../assets/nba/*.svg', { eager:true, query:'?url', import:'default' });

/** Bundled URLs only: no CDN requests are made by the app. */
export function getTeamLogoUrl(id) {
  if (!getNbaTeam(id)) return null;
  return logos[`../../../assets/nba/${id}.svg`] ?? null;
}
