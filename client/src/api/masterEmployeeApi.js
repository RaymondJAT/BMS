import { apiClient } from './axios'

/**
 * ASSUMPTION — not yet verified against the actual master-employee controller.
 * No getMasterEmployee controller/response shape has been shared, so this
 * assumes a similar pattern to master-department: raw column-aliased keys
 * like { id, fullname, department_id, position_id, status, createdAt }
 * (mirroring me_id/me_fullname/me_department_id/me_position_id/me_status
 * from the master_employee migration).
 *
 * If the real response uses different keys, only the field names accessed
 * in useCashDisbursementLookups.js need updating — this file itself is
 * shape-agnostic.
 */
export const masterEmployeeApi = {
  getAll: async () => {
    const response = await apiClient.get('/master-employee')
    return response.data || []
  },
}

export default masterEmployeeApi
