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

const isJsonResponse = (contentType) => {
  return contentType && (
    contentType.includes('application/json') ||
    contentType.includes('application/javascript')
  )
}

const parseResponse = async (response) => {
  const contentType = response.headers.get('content-type')
  
  if (!response.ok) {
    let errorMessage = `HTTP error! status: ${response.status}`
    try {
      if (isJsonResponse(contentType)) {
        const errorData = await response.json()
        errorMessage = errorData.error || errorData.message || errorMessage
      } else {
        const text = await response.text()
        console.error('Non-JSON error response:', text)
      }
    } catch (e) {
      console.error('Error parsing error response:', e)
    }
    throw new Error(errorMessage)
  }
  
  if (!isJsonResponse(contentType)) {
    const text = await response.text()
    console.error('Unexpected response type:', contentType, text)
    throw new Error('Response is not JSON')
  }
  
  return response.json()
}

const fetchWithRetry = async (url, options, retries = 3, backoff = 1000) => {
  let lastError
  
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`Attempt ${i + 1} for ${url}`)
      const response = await fetch(url, options)
      return await parseResponse(response)
    } catch (error) {
      console.error(`Attempt ${i + 1} failed:`, error)
      lastError = error
      
      if (i < retries - 1) {
        const delay = backoff * Math.pow(2, i)
        console.log(`Retrying in ${delay}ms... ${retries - i - 1} attempts left`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  
  throw lastError
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
  },

  syncSnowflake: async (holdings, prices) => {
    try {
      const response = await fetchWithRetry(
        `${API_BASE}/api/sync-snowflake`,
        {
          ...defaultOptions,
          method: 'POST',
          body: JSON.stringify({ holdings, prices })
        }
      )
      console.log('Sync response:', response)
      return response
    } catch (error) {
      console.error('Error syncing with Snowflake:', error)
      throw error
    }
  }
} 