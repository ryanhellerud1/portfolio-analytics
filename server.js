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
  origin: ['https://portfolio-metrics.netlify.app', 'http://localhost:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
}

app.use(cors(corsOptions))
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
    console.log('Received sync request:', {
      body: req.body,
      timestamp: new Date().toISOString()
    })

    if (!validateSnowflakeConfig()) {
      throw new Error('Snowflake is not properly configured')
    }

    const { holdings, prices } = req.body
    if (!holdings || !prices || !Array.isArray(holdings) || !Array.isArray(prices)) {
      throw new Error('Invalid sync payload format')
    }

    let options = {
      mode: 'text',
      pythonPath: process.env.PYTHON_PATH || 'python3',
      scriptPath: path.join(__dirname, 'scripts'),
      args: [JSON.stringify(req.body)],
      env: {
        ...process.env,
        PYTHONPATH: process.env.PYTHONPATH || process.env.PYTHON_PATH,
        PATH: process.env.PATH
      }
    }

    console.log('Starting Python sync with options:', {
      scriptPath: options.scriptPath,
      pythonPath: options.pythonPath,
      timestamp: new Date().toISOString()
    })

    try {
      const results = await PythonShell.run('snowflake_sync.py', options)
      console.log('Python sync completed:', results)
      res.json({ 
        message: 'Sync completed successfully', 
        results,
        timestamp: new Date().toISOString()
      })
    } catch (pythonError) {
      console.error('Python script error:', {
        error: pythonError,
        traceback: pythonError.traceback,
        timestamp: new Date().toISOString()
      })
      throw new Error(`Python sync failed: ${pythonError.message || 'Unknown error'}`)
    }
  } catch (error) {
    console.error('Snowflake sync error:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    })
    res.status(500).json({ 
      error: 'Failed to sync with Snowflake',
      details: error.message,
      timestamp: new Date().toISOString()
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