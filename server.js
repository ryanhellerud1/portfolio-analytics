import express from 'express'
import cors from 'cors'
import axios from 'axios'
import pkg from 'python-shell'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import snowflake from 'snowflake-sdk'
import 'dotenv/config'

// Configure dotenv at the start
dotenv.config()

// Set default values for APIs
const COINGECKO_API_URL = process.env.COINGECKO_API_URL || 'https://api.coingecko.com/api/v3'
const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY || 'CG-DEMO-KEY'

// Validate only critical environment variables
const requiredEnvVars = [
  'SNOWFLAKE_ACCOUNT',
  'SNOWFLAKE_USERNAME',
  'SNOWFLAKE_PASSWORD',
  'SNOWFLAKE_DATABASE',
  'SNOWFLAKE_WAREHOUSE',
  'SNOWFLAKE_ROLE'
]

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName])
if (missingEnvVars.length > 0) {
  console.warn('Missing some Snowflake environment variables:', missingEnvVars)
  console.warn('Some features might not work without Snowflake configuration')
}

const { PythonShell } = pkg
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()

// CORS configuration
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'https://portfolio-metrics.netlify.app');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Max-Age', '86400'); // 24 hours
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json())

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
})

// Create axios instance for CoinGecko with API key
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

// Rate limiting configuration
const RATE_LIMIT = {
  requestsPerMinute: 30,
  minTimeBetweenRequests: 2000,
  lastRequestTime: 0,
  requestCount: 0,
  resetTime: Date.now()
}

// Cache configuration
const priceCache = new Map()
const CACHE_DURATION = 60000 // 1 minute cache

// Add Snowflake connection helper
const get_snowflake_connection = () => {
  return new Promise((resolve, reject) => {
    try {
      const account = process.env.SNOWFLAKE_ACCOUNT
      const region = process.env.SNOWFLAKE_REGION
      const account_identifier = `${account}.${region}`
      
      const connection = snowflake.createConnection({
        account: account_identifier,
        username: process.env.SNOWFLAKE_USERNAME,
        password: process.env.SNOWFLAKE_PASSWORD,
        warehouse: process.env.SNOWFLAKE_WAREHOUSE,
        database: process.env.SNOWFLAKE_DATABASE,
        schema: process.env.SNOWFLAKE_SCHEMA
      })

      connection.connect((err, conn) => {
        if (err) {
          console.error('Snowflake connection error:', err)
          reject(err)
        } else {
          resolve(conn)
        }
      })
    } catch (error) {
      console.error('Snowflake setup error:', error)
      reject(error)
    }
  })
}

// Price endpoint
app.get('/api/prices', async (req, res) => {
  try {
    const { ids } = req.query
    if (!ids) {
      return res.status(400).json({ error: 'Missing coin IDs' })
    }

    const idArray = ids.split(',')
    try {
      // Use /coins/markets endpoint for better price change data
      const response = await coingeckoApi.get('/coins/markets', {
        params: {
          vs_currency: 'usd',
          ids: idArray.join(','),
          order: 'market_cap_desc',
          per_page: 250,
          sparkline: false,
          price_change_percentage: '24h',
          x_cg_demo_api_key: COINGECKO_API_KEY
        }
      })

      // Format the response to match our expected structure
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

// Snowflake sync endpoint
app.post('/api/sync-snowflake', async (req, res) => {
  try {
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

    console.log('Debug - Python paths:', {
      PYTHON_PATH: process.env.PYTHON_PATH,
      PYTHONPATH: process.env.PYTHONPATH,
      scriptPath: options.scriptPath,
      cwd: process.cwd()
    })

    try {
      const results = await PythonShell.run('snowflake_sync.py', options)
      console.log('Python script output:', results)
      res.json({ 
        message: 'Sync completed', 
        results 
      })
    } catch (pythonError) {
      console.error('Python script error:', pythonError)
      const errorMessage = pythonError.traceback || pythonError.message
      throw new Error(`Python script failed: ${errorMessage}`)
    }
  } catch (error) {
    console.error('Snowflake sync error:', error)
    res.status(500).json({ 
      error: 'Failed to sync with Snowflake',
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

    // First get search results
    const searchResponse = await coingeckoApi.get('/search', {
      params: { query }
    })

    // Then get current prices and details for the found coins
    if (searchResponse.data.coins.length > 0) {
      const coinIds = searchResponse.data.coins.map(coin => coin.id).slice(0, 10) // Limit to top 10
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

      // Merge search results with current prices
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
        coins: enrichedResults.slice(0, 10) // Return only top 10 results
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

// Update analytics endpoints
app.get('/api/analytics/performance', async (req, res) => {
  let connection
  try {
    connection = await get_snowflake_connection()
    
    // Use Promise to handle async execution
    const data = await new Promise((resolve, reject) => {
      connection.execute({
        sqlText: 'SELECT * FROM PORTFOLIO_PERFORMANCE',
        complete: (err, stmt, rows) => {
          if (err) {
            reject(err)
            return
          }

          // Convert column names to lowercase and format data
          const formattedData = rows.map(row => ({
            category: row.CATEGORY || 'Other',
            total_value: parseFloat(row.TOTAL_VALUE) || 0,
            percentage: parseFloat(row.PERCENTAGE) || 0,
            num_coins: parseInt(row.NUM_COINS) || 0,
            avg_24h_change: parseFloat(row.AVG_24H_CHANGE) || 0
          }))

          resolve(formattedData)
        }
      })
    })

    console.log('Portfolio performance data:', data)
    res.json({ data })

  } catch (error) {
    console.error('Error fetching portfolio performance:', error)
    res.status(500).json({ error: 'Failed to fetch analytics' })
  } finally {
    if (connection) {
      try {
        await new Promise((resolve, reject) => {
          connection.destroy((err) => {
            if (err) {
              console.error('Error destroying connection:', err)
              reject(err)
            } else {
              resolve()
            }
          })
        })
      } catch (err) {
        console.error('Error during connection cleanup:', err)
      }
    }
  }
})

app.get('/api/analytics/alerts', async (req, res) => {
  let connection
  try {
    connection = await get_snowflake_connection()
    
    // Use Promise to handle async execution
    const data = await new Promise((resolve, reject) => {
      connection.execute({
        sqlText: 'SELECT * FROM PRICE_ALERTS',
        complete: (err, stmt, rows) => {
          if (err) {
            reject(err)
            return
          }

          // Format the data
          const formattedData = rows.map(row => ({
            coin_id: row.COIN_ID,
            symbol: row.SYMBOL,
            name: row.NAME,
            current_price: parseFloat(row.CURRENT_PRICE),
            price_change_24h_pct: parseFloat(row.PRICE_CHANGE_24H_PCT),
            alert_type: row.ALERT_TYPE
          }))

          resolve(formattedData)
        }
      })
    })

    res.json({ data })

  } catch (error) {
    console.error('Error fetching price alerts:', error)
    res.status(500).json({ error: 'Failed to fetch alerts' })
  } finally {
    if (connection) {
      try {
        await new Promise((resolve, reject) => {
          connection.destroy((err) => {
            if (err) {
              console.error('Error destroying connection:', err)
              reject(err)
            } else {
              resolve()
            }
          })
        })
      } catch (err) {
        console.error('Error during connection cleanup:', err)
      }
    }
  }
})

app.get('/api/analytics/technical', async (req, res) => {
  let connection
  try {
    connection = await get_snowflake_connection()
    const data = await new Promise((resolve, reject) => {
      connection.execute({
        sqlText: `
          SELECT * FROM TECHNICAL_INDICATORS 
          WHERE TIMESTAMP >= DATEADD(day, -7, CURRENT_TIMESTAMP())
          ORDER BY TIMESTAMP DESC
        `,
        complete: (err, stmt, rows) => {
          if (err) reject(err)
          else resolve(rows)
        }
      })
    })
    res.json({ data })
  } catch (error) {
    console.error('Error fetching technical indicators:', error)
    res.status(500).json({ error: 'Failed to fetch technical indicators' })
  } finally {
    if (connection) await connection.destroy()
  }
})

app.get('/api/analytics/risk', async (req, res) => {
  let connection
  try {
    connection = await get_snowflake_connection()
    const data = await new Promise((resolve, reject) => {
      connection.execute({
        sqlText: `
          SELECT * FROM PORTFOLIO_RISK_ANALYSIS
          WHERE DATE >= DATEADD(day, -30, CURRENT_DATE())
          ORDER BY DATE DESC
        `,
        complete: (err, stmt, rows) => {
          if (err) reject(err)
          else resolve(rows)
        }
      })
    })
    res.json({ data })
  } catch (error) {
    console.error('Error fetching risk analysis:', error)
    res.status(500).json({ error: 'Failed to fetch risk analysis' })
  } finally {
    if (connection) await connection.destroy()
  }
})

// Add momentum endpoint
app.get('/api/analytics/momentum', async (req, res) => {
  let connection
  try {
    connection = await get_snowflake_connection()
    const data = await new Promise((resolve, reject) => {
      connection.execute({
        sqlText: `
          SELECT * FROM PRICE_MOMENTUM
          WHERE TIMESTAMP >= DATEADD(day, -30, CURRENT_TIMESTAMP())
          ORDER BY TIMESTAMP DESC
        `,
        complete: (err, stmt, rows) => {
          if (err) reject(err)
          else resolve(rows)
        }
      })
    })
    res.json({ data })
  } catch (error) {
    console.error('Error fetching price momentum:', error)
    res.status(500).json({ error: 'Failed to fetch price momentum' })
  } finally {
    if (connection) await connection.destroy()
  }
})

// Clean up old cache entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of priceCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      priceCache.delete(key)
    }
  }
}, CACHE_DURATION)

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
    status: err.status || 500
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.url}`
  });
});

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  console.log('Environment:', process.env.NODE_ENV)
}) 