const API_BASE = process.env.NODE_ENV === 'production'
  ? 'https://crypto-tracker-api.onrender.com'
  : 'http://localhost:3001'

const defaultHeaders = {
  'Accept': 'application/json',
  'Content-Type': 'application/json'
}

const handleResponse = async (response) => {
  if (!response.ok) {
    const error = await response.text()
    throw new Error(error)
  }
  return response.json()
}

export const apiService = {
  // Price related endpoints
  getPrices: async (coinIds) => {
    try {
      const response = await fetch(`${API_BASE}/api/prices?ids=${coinIds.join(',')}`, {
        headers: defaultHeaders
      })
      return handleResponse(response)
    } catch (error) {
      console.error('Error fetching prices:', error)
      return {}
    }
  },

  getMarkets: async () => {
    try {
      const response = await fetch(`${API_BASE}/api/markets`, {
        headers: defaultHeaders
      })
      return handleResponse(response)
    } catch (error) {
      console.error('Error fetching markets:', error)
      return []
    }
  },

  searchCryptos: async (query) => {
    try {
      const response = await fetch(`${API_BASE}/api/search?query=${query}`, {
        headers: defaultHeaders
      })
      return handleResponse(response)
    } catch (error) {
      console.error('Error searching cryptos:', error)
      return { coins: [] }
    }
  },

  // Analytics endpoints
  getPerformance: async () => {
    try {
      const response = await fetch(`${API_BASE}/api/analytics/performance`, {
        headers: defaultHeaders
      })
      return handleResponse(response)
    } catch (error) {
      console.error('Error fetching performance:', error)
      return { data: [] }
    }
  },

  getAlerts: async () => {
    try {
      const response = await fetch(`${API_BASE}/api/analytics/alerts`, {
        headers: defaultHeaders
      })
      return handleResponse(response)
    } catch (error) {
      console.error('Error fetching alerts:', error)
      return { data: [] }
    }
  },

  getTechnicalIndicators: async () => {
    try {
      const response = await fetch(`${API_BASE}/api/analytics/technical`, {
        headers: defaultHeaders
      })
      return handleResponse(response)
    } catch (error) {
      console.error('Error fetching technical indicators:', error)
      return { data: [] }
    }
  },

  getRiskAnalysis: async () => {
    try {
      const response = await fetch(`${API_BASE}/api/analytics/risk`, {
        headers: defaultHeaders
      })
      return handleResponse(response)
    } catch (error) {
      console.error('Error fetching risk analysis:', error)
      return { data: [] }
    }
  },

  getMomentumAnalysis: async () => {
    try {
      const response = await fetch(`${API_BASE}/api/analytics/momentum`, {
        headers: defaultHeaders
      })
      return handleResponse(response)
    } catch (error) {
      console.error('Error fetching momentum analysis:', error)
      return { data: [] }
    }
  }
} 