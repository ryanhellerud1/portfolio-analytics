import { apiService } from './apiService'

export const cryptoApi = {
  getTopCryptos: async () => {
    return apiService.getMarkets()
  },

  searchCryptos: async (query) => {
    if (!query || query.length < 2) return []
    const response = await apiService.searchCryptos(query)
    return response.coins || []
  },

  getPrices: async (coinIds) => {
    if (!coinIds || coinIds.length === 0) {
      return {}
    }
    return apiService.getPrices(coinIds)
  }
} 