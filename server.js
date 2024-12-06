import express from 'express'
import cors from 'cors'
import axios from 'axios'
import pkg from 'python-shell'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import 'dotenv/config'
import analyticsRoutes from './src/routes/analytics.js'
import { validateSnowflakeConfig } from './src/utils/snowflake.js'

// Configure dotenv at the start
dotenv.config()

// Set up file paths
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const { PythonShell } = pkg

const app = express()

// CORS configuration
const corsOptions = {
  origin: '*',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  preflightContinue: false,
  optionsSuccessStatus: 204,
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  credentials: false
}

// Apply CORS middleware
app.use(cors(corsOptions))

// Handle OPTIONS requests explicitly
app.options('*', cors(corsOptions))

// Add CORS headers to all responses
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Origin, X-Requested-With')
  next()
})

app.use(express.json())

// Add request logging with more details
app.use((req, res, next) => {
  const start = Date.now()
  res.on('finish', () => {
    const duration = Date.now() - start
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`)
  })
  next()
})

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Crypto Tracker API',
    status: 'running',
    endpoints: ['/health', '/debug', '/api/prices', '/api/markets', '/api/search', '/api/analytics/*']
  })
})

// Health check endpoint
app.get('/health', (req, res) => {
  console.log('Health check requested')
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    snowflake: validateSnowflakeConfig()
  })
})

// Debug endpoint
app.get('/debug', (req, res) => {
  console.log('Debug info requested')
  res.json({
    status: 'ok',
    headers: req.headers,
    origin: req.get('origin'),
    method: req.method,
    path: req.path,
    env: process.env.NODE_ENV || 'development',
    node_version: process.version,
    memory_usage: process.memoryUsage(),
    uptime: process.uptime()
  })
})

// Set default values for APIs
const COINGECKO_API_URL = process.env.COINGECKO_API_URL || 'https://api.coingecko.com/api/v3'
const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY || 'CG-DEMO-KEY'

// Create axios instance for CoinGecko
const coingeckoApi = axios.create({
  baseURL: COINGECKO_API_URL,
  timeout: 10000,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'x-cg-demo-api-key': COINGECKO_API_KEY
  }
})

// Debug logging helper
const debugLog = (message, data) => {
  console.log(`[DEBUG] ${message}:`, JSON.stringify(data, null, 2))
}

// Add logging interceptor
coingeckoApi.interceptors.request.use(request => {
  debugLog('Making CoinGecko request', {
    url: request.url,
    params: request.params,
    headers: {
      ...request.headers,
      'x-cg-demo-api-key': 'HIDDEN'  // Hide API key in logs
    }
  })
  return request
})

// Mount analytics routes first (before other routes)
app.use('/api/analytics', analyticsRoutes)

// Price endpoint
app.get('/api/prices', async (req, res) => {
  try {
    const { ids } = req.query
    if (!ids) {
      return res.status(400).json({ error: 'Missing coin IDs' })
    }

    const idArray = ids.split(',')
    try {
      const response = await coingeckoApi.get('/coins/markets', {
        params: {
          vs_currency: 'usd',
          ids: idArray.join(','),
          order: 'market_cap_desc',
          per_page: 250,
          sparkline: false,
          price_change_percentage: '24h'
        }
      })

      const formattedData = {}
      response.data.forEach(coin => {
        formattedData[coin.id] = {
          usd: coin.current_price,
          usd_24h_change: coin.price_change_percentage_24h,
          usd_24h_vol: coin.total_volume,
          usd_market_cap: coin.market_cap
        }
      })

      return res.json(formattedData)
    } catch (coingeckoError) {
      console.error('CoinGecko API error:', coingeckoError)
      return res.json(idArray.reduce((acc, id) => {
        acc[id] = {
          usd: 0,
          usd_24h_change: 0,
          usd_24h_vol: 0,
          usd_market_cap: 0
        }
        return acc
      }, {}))
    }
  } catch (error) {
    console.error('Price fetch error:', error)
    res.status(500).json({ 
      error: 'Failed to fetch prices',
      details: error.message
    })
  }
})

// Markets endpoint
app.get('/api/markets', async (req, res) => {
  try {
    const response = await coingeckoApi.get('/coins/markets', {
      params: {
        vs_currency: 'usd',
        order: 'market_cap_desc',
        per_page: 10,
        sparkline: false
      }
    })
    res.json(response.data)
  } catch (error) {
    console.error('Markets error:', error)
    res.status(500).json({ 
      error: 'Failed to fetch markets',
      details: error.message
    })
  }
})

// Search endpoint
app.get('/api/search', async (req, res) => {
  try {
    const { query } = req.query
    if (!query) {
      return res.status(400).json({ error: 'Missing search query' })
    }

    const searchResponse = await coingeckoApi.get('/search', {
      params: { query }
    })

    if (searchResponse.data.coins.length > 0) {
      const coinIds = searchResponse.data.coins.map(coin => coin.id).slice(0, 10)
      const detailsResponse = await coingeckoApi.get('/coins/markets', {
        params: {
          vs_currency: 'usd',
          ids: coinIds.join(','),
          order: 'market_cap_desc',
          per_page: 10,
          sparkline: false,
          price_change_percentage: '24h'
        }
      })

      const enrichedResults = searchResponse.data.coins.map(coin => {
        const details = detailsResponse.data.find(d => d.id === coin.id) || {}
        return {
          ...coin,
          current_price: details.current_price,
          market_cap: details.market_cap,
          price_change_24h: details.price_change_percentage_24h
        }
      })

      res.json({
        coins: enrichedResults.slice(0, 10)
      })
    } else {
      res.json({ coins: [] })
    }
  } catch (error) {
    console.error('Search error:', error)
    res.status(500).json({ 
      error: 'Failed to search',
      details: error.message
    })
  }
})

// Snowflake sync endpoint
app.post('/api/sync-snowflake', async (req, res) => {
  try {
    const { holdings, prices } = req.body
    
    if (!holdings || !prices) {
      return res.status(400).json({ error: 'Missing required data' })
    }

    console.log('Sync request received:', {
      holdings: holdings.length,
      prices: prices.length
    })

    // Validate holdings data
    const requiredHoldingFields = ['coin_id', 'symbol', 'name', 'amount']
    for (const holding of holdings) {
      const missingFields = requiredHoldingFields.filter(field => !holding[field])
      if (missingFields.length > 0) {
        return res.status(400).json({
          error: 'Invalid holding data',
          details: `Missing fields: ${missingFields.join(', ')}`
        })
      }
    }

    // Validate prices data
    const requiredPriceFields = ['coin_id', 'price_usd']
    for (const price of prices) {
      const missingFields = requiredPriceFields.filter(field => !price[field])
      if (missingFields.length > 0) {
        return res.status(400).json({
          error: 'Invalid price data',
          details: `Missing fields: ${missingFields.join(', ')}`
        })
      }
    }

    const options = {
      mode: 'text',
      pythonPath: process.env.PYTHON_PATH,
      pythonOptions: ['-u'],
      scriptPath: './scripts',
      args: [JSON.stringify({ holdings, prices })]
    }

    console.log('Running sync script with options:', {
      pythonPath: options.pythonPath,
      scriptPath: options.scriptPath
    })

    PythonShell.run('snowflake_sync.py', options).then(results => {
      console.log('Sync Results:', results)
      try {
        const result = JSON.parse(results[results.length - 1])
        res.json(result)
      } catch (e) {
        console.error('Error parsing sync results:', e, results)
        res.status(500).json({
          error: 'Failed to parse sync results',
          details: results
        })
      }
    }).catch(err => {
      console.error('Sync Error:', err)
      res.status(500).json({
        error: 'Sync failed',
        details: err.message,
        stack: err.stack
      })
    })
  } catch (error) {
    console.error('Sync error:', error)
    res.status(500).json({
      error: 'Failed to sync with Snowflake',
      details: error.message,
      stack: error.stack
    })
  }
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error details:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  })
  
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
    status: err.status || 500,
    path: req.path
  })
})

// 404 handler
app.use((req, res) => {
  console.log('404 Not Found:', {
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  })
  
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.url}`,
    path: req.path
  })
})

const PORT = process.env.PORT || 3001
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`)
  console.log('Environment:', process.env.NODE_ENV)
  console.log('CoinGecko API URL:', COINGECKO_API_URL)
  console.log('Server listening on all interfaces (0.0.0.0)')
}) 