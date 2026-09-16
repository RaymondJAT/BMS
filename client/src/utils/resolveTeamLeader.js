/**
 * Resolves a Liquidation's Team Lead display name.
 *
 * Team Lead lives on cash_request (cr_team_lead), not on liquidation
 * itself, so it only shows up here if the liquidation detail endpoint
 * joins it in. This endpoint already flattens other cash_request fields
 * with a `cash_request_*` prefix (see cash_request_reference_id /
 * cash_request_id used elsewhere on this same object), so that's checked
 * first as the most likely real field name. The unprefixed variants are
 * kept as a fallback in case the backend exposes it differently.
 *
 * If this still resolves to '—' after checking, log the raw
 * liquidationApi.getById(id) response — none of these keys may actually
 * be present, which means the backend join itself needs to add the field
 * (see liquidation-liquidation.controller.js's detail query).
 */
export function resolveTeamLeader(liquidation, getEmployeeName) {
  if (!liquidation) return '—'

  const teamLeadValue =
    liquidation.cash_request_team_lead ??
    liquidation.team_lead ??
    liquidation.team_leader ??
    liquidation.team_lead_id ??
    liquidation.team_leader_id

  if (!teamLeadValue) return '—'

  if (typeof getEmployeeName === 'function') {
    const resolved = getEmployeeName(teamLeadValue)
    if (resolved && resolved !== 'N/A') return resolved
  }

  return teamLeadValue
}

export default resolveTeamLeader
