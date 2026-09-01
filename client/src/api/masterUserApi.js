import { apiClient } from './axios'

/**
 * Confirmed response shape (master-user.controller.js getMasterUser):
 *   { id, user_id, username, password, status, employee_id, access_id,
 *     fullname, createdAt }
 *
 * `id` and `user_id` are the same value (kept for compatibility with
 * either key). `fullname` is the linked employee's name, pre-joined.
 */
export const masterUserApi = {
  getAll: async () => {
    const response = await apiClient.get('/master-user')
    return response.data || []
  },
}

export default masterUserApi
