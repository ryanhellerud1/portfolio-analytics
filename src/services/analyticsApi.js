const API_BASE = process.env.NODE_ENV === 'production'
  ? 'https://crypto-tracker-api.onrender.com'  // Remove /api since it's added in the routes
  : 'http://localhost:3001'

export const analyticsApi = {
  getTechnicalIndicators: async () => {
    try {
      const response = await fetch(`${API_BASE}/api/analytics/technical`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error fetching technical indicators:', error)
      return { data: [] }
    }
  },

  getVolatilityAnalysis: async () => {
    try {
      const response = await fetch(`${API_BASE}/api/analytics/risk`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error fetching volatility analysis:', error)
      return { data: [] }
    }
  },

  getPriceMomentum: async () => {
    try {
      const response = await fetch(`${API_BASE}/api/analytics/momentum`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error fetching price momentum:', error)
      return { data: [] }
    }
  }
} 