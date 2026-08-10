import { apiClient } from './axios'

/**
 * ASSUMPTION — not yet verified against the actual master-particulars
 * controller. The cash-disbursement controller's getParticularsNameById
 * helper reads `mpt_name` directly via raw SQL, which confirms the DB
 * column name, but the REST endpoint's response shape (aliased keys) has
 * not been shared. This assumes { id, name, status, createdAt }, mirroring
 * the master-department pattern.
 *
 * If the real response uses different keys, only the field names accessed
 * in useCashDisbursementLookups.js need updating — this file itself is
 * shape-agnostic.
 */
export const masterParticularsApi = {
  getAll: async () => {
    const response = await apiClient.get('/master-particulars')
    return response.data || []
  },
}

export default masterParticularsApi
