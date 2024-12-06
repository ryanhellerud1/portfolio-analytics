import { apiService } from './apiService'

export const analyticsApi = {
  getTechnicalIndicators: async () => {
    return apiService.getTechnicalIndicators()
  },

  getRiskAnalysis: async () => {
    return apiService.getRiskAnalysis()
  },

  getPriceMomentum: async () => {
    return apiService.getMomentumAnalysis()
  },

  getPerformance: async () => {
    return apiService.getPerformance()
  },

  getAlerts: async () => {
    return apiService.getAlerts()
  }
} 