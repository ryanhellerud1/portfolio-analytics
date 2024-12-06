const API_BASE = import.meta.env.VITE_API_URL || 
  (import.meta.env.MODE === 'production'
    ? 'https://crypto-tracker-api-djbp.onrender.com'
    : 'http://localhost:3001')

console.log('API Service initialized with base URL:', API_BASE)

const defaultHeaders = {
  'Accept': 'application/json',
  'Content-Type': 'application/json'
}

const defaultOptions = {
  headers: defaultHeaders,
  mode: 'cors',
  cache: 'no-cache'
}

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

const fetchWithRetry = async (url, options, retries = 3, backoff = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
          attempt: i + 1
        })
        
        if (response.status === 0 || response.status === 429 || response.status >= 500) {
          throw new Error(`Retryable error: ${response.status}`)
        }
        
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Invalid content type:', contentType)
        throw new Error('Response is not JSON')
      }
      
      return await response.json()
    } catch (error) {
      console.error(`Attempt ${i + 1} failed:`, error)
      
      if (i === retries - 1) {
        throw error
      }
      
      console.log(`Retrying... ${retries - i - 1} attempts left`)
      await delay(backoff * Math.pow(2, i))
    }
  }
}

const handleResponse = async (response) => {
  try {
    console.log('API Response:', {
      url: response.url,
      status: response.status,
      statusText: response.statusText
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    return data
  } catch (error) {
    console.error('API Error:', error)
    throw error
  }
}

export const apiService = {
  getPrices: async (coinIds) => {
    if (!coinIds || !Array.isArray(coinIds) || coinIds.length === 0) {
      return {}
    }
    try {
      return await fetchWithRetry(
        `${API_BASE}/api/prices?ids=${coinIds.join(',')}`,
        defaultOptions
      )
    } catch (error) {
      console.error('Error fetching prices:', error)
      return {}
    }
  },

  getMarkets: async () => {
    try {
      return await fetchWithRetry(
        `${API_BASE}/api/markets`,
        defaultOptions
      )
    } catch (error) {
      console.error('Error fetching markets:', error)
      return []
    }
  },

  searchCryptos: async (query) => {
    if (!query) return { coins: [] }
    try {
      return await fetchWithRetry(
        `${API_BASE}/api/search?query=${encodeURIComponent(query)}`,
        defaultOptions
      )
    } catch (error) {
      console.error('Error searching cryptos:', error)
      return { coins: [] }
    }
  },

  // Analytics endpoints
  getPerformance: async () => {
    try {
      return await fetchWithRetry(
        `${API_BASE}/api/analytics/performance`,
        defaultOptions
      )
    } catch (error) {
      console.error('Error fetching performance:', error)
      return { data: [] }
    }
  },

  getAlerts: async () => {
    try {
      return await fetchWithRetry(
        `${API_BASE}/api/analytics/alerts`,
        defaultOptions
      )
    } catch (error) {
      console.error('Error fetching alerts:', error)
      return { data: [] }
    }
  },

  getTechnicalIndicators: async () => {
    try {
      return await fetchWithRetry(
        `${API_BASE}/api/analytics/technical`,
        defaultOptions
      )
    } catch (error) {
      console.error('Error fetching technical indicators:', error)
      return { data: [] }
    }
  },

  getRiskAnalysis: async () => {
    try {
      return await fetchWithRetry(
        `${API_BASE}/api/analytics/risk`,
        defaultOptions
      )
    } catch (error) {
      console.error('Error fetching risk analysis:', error)
      return { data: [] }
    }
  },

  getMomentumAnalysis: async () => {
    try {
      return await fetchWithRetry(
        `${API_BASE}/api/analytics/momentum`,
        defaultOptions
      )
    } catch (error) {
      console.error('Error fetching momentum analysis:', error)
      return { data: [] }
    }
  }
} 