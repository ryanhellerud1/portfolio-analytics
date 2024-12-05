import axios from 'axios'

const PROXY_API = 'http://localhost:3001/api'

// Add delay helper function
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

const coingeckoClient = axios.create({
  baseURL: PROXY_API,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  }
})

// Add a cache for coin IDs
const coinIdCache = new Map()

export const cryptoApi = {
  getTopCryptos: async () => {
    try {
      await delay(1000) // Add delay to avoid rate limiting
      const response = await coingeckoClient.get('/coins/markets', {
        params: {
          vs_currency: 'usd',
          order: 'market_cap_desc',
          per_page: 10,
          sparkline: false
        }
      })
      return response.data
    } catch (error) {
      console.error('Error fetching top cryptos:', error.response?.data || error.message)
      return []
    }
  },

  searchCryptos: async (query) => {
    if (!query || query.length < 2) return []
    try {
      await delay(1000)
      const response = await coingeckoClient.get('/search', {
        params: { query }
      })
      
      // Cache the coin IDs from search results
      response.data.coins.forEach(coin => {
        coinIdCache.set(coin.id.toLowerCase(), {
          id: coin.id,
          symbol: coin.symbol,
          name: coin.name
        })
      })
      
      return response.data.coins
    } catch (error) {
      console.error('Error searching cryptos:', error.response?.data || error.message)
      return []
    }
  },

  getPrices: async (coinIds) => {
    if (!coinIds || coinIds.length === 0) {
      return {}
    }

    try {
      const response = await fetch(`/api/prices?ids=${coinIds.join(',')}`)
      const data = await response.json()
      
      // Add detailed logging
      console.log('CoinGecko price response:', {
        raw: data,
        sample: Object.entries(data).map(([id, priceData]) => ({
          id,
          price: priceData.usd,
          change_24h: priceData.usd_24h_change
        }))
      })
      
      return data
    } catch (error) {
      console.error('Error fetching prices:', error)
      return coinIds.reduce((acc, id) => {
        acc[id] = {
          usd: 0,
          usd_24h_change: 0,
          usd_24h_vol: 0,
          usd_market_cap: 0
        }
        return acc
      }, {})
    }
  }
} 