const API_BASE = process.env.NODE_ENV === 'production'
  ? 'https://crypto-tracker-api.onrender.com/api'  // Replace with your Render app URL
  : 'http://localhost:3001/api'

export const analyticsApi = {
  getTechnicalIndicators: async () => {
    try {
      const response = await fetch(`${API_BASE}/analytics/technical`)
      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error fetching technical indicators:', error)
      return { data: [] }
    }
  },

  getVolatilityAnalysis: async () => {
    try {
      const response = await fetch(`${API_BASE}/analytics/risk`)
      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error fetching volatility analysis:', error)
      return { data: [] }
    }
  },

  getPriceMomentum: async () => {
    try {
      const response = await fetch(`${API_BASE}/analytics/momentum`)
      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error fetching price momentum:', error)
      return { data: [] }
    }
  }
} 