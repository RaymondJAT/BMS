import { apiClient } from './axios'

export const liquidationApi = {
  getAll: async (params = {}) => (await apiClient.get('/liquidation', { params })).data || [],
  getById: async (id) => (await apiClient.get(`/liquidation/${id}`)).data,
  create: async (payload) => (await apiClient.post('/liquidation', payload)).data,
  update: async (payload) => (await apiClient.put('/liquidation/update', payload)).data,
  approve: async (payload) => (await apiClient.put('/liquidation/approve', payload)).data,
  reject: async (payload) => (await apiClient.put('/liquidation/reject', payload)).data,
  verify: async (payload) => (await apiClient.put('/liquidation/verify', payload)).data,
  complete: async (payload) => (await apiClient.put('/liquidation/complete', payload)).data,
  markIncomplete: async (payload) => (await apiClient.put('/liquidation/incomplete', payload)).data,
  getActivity: async (params = {}) =>
    (await apiClient.get('/liquidation/activity', { params })).data || [],
}

// Existing master-data endpoints — routes already mounted, just wrapped here.
export const masterDistrictApi = {
  getAll: async () => (await apiClient.get('/master-district')).data || [],
}
export const masterModeOfTransportationApi = {
  getAll: async () => (await apiClient.get('/master-modeoftransportation')).data || [],
}

export const cashRequestEligibilityApi = {
  check: async (employeeId) =>
    (await apiClient.get('/cash-request/eligibility', { params: { employee_id: employeeId } }))
      .data,
}

export default liquidationApi
