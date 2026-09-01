import { apiClient } from './axios'

/**
 * Confirmed response shape (master-employee.controller.js getMasterEmployee):
 *   { id, employee_id, fullname, department_id, department_name,
 *     position_id, position_name, status, createdAt }
 *
 * department_name / position_name come pre-joined from the backend —
 * no separate department/position lookup is needed to render a row.
 */
export const masterEmployeeApi = {
  getAll: async () => {
    const response = await apiClient.get('/master-employee')
    return response.data || []
  },
}

export default masterEmployeeApi
