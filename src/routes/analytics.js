import express from 'express'
import snowflake from 'snowflake-sdk'
import { validateSnowflakeConfig } from '../utils/snowflake.js'

const router = express.Router()

// Debug logging middleware for analytics routes
router.use((req, res, next) => {
  console.log(`[Analytics] Processing ${req.method} ${req.originalUrl}`)
  const isSnowflakeConfigured = validateSnowflakeConfig()
  console.log(`[Analytics] Snowflake configured: ${isSnowflakeConfigured ? '✅' : '❌'}`)
  next()
})

// Helper function to get Snowflake connection
const getSnowflakeConnection = () => {
  return new Promise((resolve, reject) => {
    const connection = snowflake.createConnection({
      account: process.env.SNOWFLAKE_ACCOUNT,
      username: process.env.SNOWFLAKE_USERNAME,
      password: process.env.SNOWFLAKE_PASSWORD,
      database: process.env.SNOWFLAKE_DATABASE,
      warehouse: process.env.SNOWFLAKE_WAREHOUSE,
      schema: process.env.SNOWFLAKE_SCHEMA || 'PUBLIC',
      role: process.env.SNOWFLAKE_ROLE
    })

    connection.connect((err, conn) => {
      if (err) {
        console.error('Failed to connect to Snowflake:', err)
        reject(err)
      } else {
        console.log('Successfully connected to Snowflake')
        resolve(conn)
      }
    })
  })
}

// Helper function to execute Snowflake query
const executeSnowflakeQuery = async (query) => {
  const connection = await getSnowflakeConnection()
  return new Promise((resolve, reject) => {
    connection.execute({
      sqlText: query,
      complete: (err, stmt, rows) => {
        connection.destroy((destroyErr) => {
          if (destroyErr) {
            console.error('Error destroying connection:', destroyErr)
          }
        })
        
        if (err) {
          reject(err)
        } else {
          resolve(rows)
        }
      }
    })
  })
}

// Helper function to handle Snowflake or return mock data
const getDataWithFallback = async (endpoint, sqlQuery, formatFunction = (data) => data) => {
  console.log(`[Analytics] Fetching data for ${endpoint}`)
  
  try {
    if (!validateSnowflakeConfig()) {
      console.log(`[Analytics] ❌ Snowflake not configured, using mock data for ${endpoint}`)
      return mockData[endpoint]
    }

    console.log(`[Analytics] 🔍 Executing query for ${endpoint}:`, sqlQuery)
    const rows = await executeSnowflakeQuery(sqlQuery)
    console.log(`[Analytics] ✅ Query successful for ${endpoint}, got ${rows?.length || 0} rows`)

    if (!rows || rows.length === 0) {
      console.log(`[Analytics] ⚠️ No data found for ${endpoint}, using mock data`)
      return mockData[endpoint]
    }

    console.log(`[Analytics] 🔄 Transforming data for ${endpoint}`)
    const transformedData = formatFunction(rows)
    console.log(`[Analytics] ✅ Data ready for ${endpoint}:`, transformedData)
    return transformedData
  } catch (error) {
    console.error(`[Analytics] ❌ Error fetching data for ${endpoint}:`, error)
    console.log(`[Analytics] ⚠️ Falling back to mock data for ${endpoint}`)
    return mockData[endpoint]
  }
}

// Mock data for when Snowflake is not available
const mockData = {
  technical: [
    {
      coin: 'BTC',
      rsi: 65.4,
      macd: 245.67,
      sma_20: 43250.45,
      ema_50: 42980.34,
      signal: 'buy'
    },
    {
      coin: 'ETH',
      rsi: 58.2,
      macd: 78.45,
      sma_20: 2280.12,
      ema_50: 2245.78,
      signal: 'hold'
    }
  ],
  risk: [
    {
      SYMBOL: 'BTC',
      RISK_CATEGORY: 'HIGH_RISK',
      DAILY_VOLATILITY: 4.5,
      SHARPE_RATIO: 1.2,
      VAR_95: 8.5,
      MAX_7D_RETURN: 15.2,
      MIN_7D_RETURN: -12.5,
      MAX_DRAWDOWN: -25.3
    },
    {
      SYMBOL: 'ETH',
      RISK_CATEGORY: 'MEDIUM_RISK',
      DAILY_VOLATILITY: 3.8,
      SHARPE_RATIO: 1.5,
      VAR_95: 7.2,
      MAX_7D_RETURN: 12.8,
      MIN_7D_RETURN: -9.6,
      MAX_DRAWDOWN: -20.1
    },
    {
      SYMBOL: 'BNB',
      RISK_CATEGORY: 'LOW_RISK',
      DAILY_VOLATILITY: 2.1,
      SHARPE_RATIO: 1.8,
      VAR_95: 4.5,
      MAX_7D_RETURN: 8.4,
      MIN_7D_RETURN: -5.2,
      MAX_DRAWDOWN: -12.5
    }
  ],
  momentum: [
    {
      coin: 'BTC',
      momentum_score: 0.85,
      trend: 'bullish',
      strength: 'strong'
    },
    {
      coin: 'ETH',
      momentum_score: 0.72,
      trend: 'bullish',
      strength: 'moderate'
    }
  ],
  performance: [
    {
      category: 'Large Cap',
      total_value: 1250000,
      percentage: 45.5,
      num_coins: 3,
      avg_24h_change: 2.8
    },
    {
      category: 'Mid Cap',
      total_value: 750000,
      percentage: 27.3,
      num_coins: 5,
      avg_24h_change: 3.2
    }
  ],
  alerts: [
    {
      type: 'PRICE_ALERT',
      coin: 'BTC',
      message: 'Bitcoin up 5% in the last hour',
      severity: 'info'
    },
    {
      type: 'VOLATILITY_ALERT',
      coin: 'ETH',
      message: 'Ethereum volatility increasing',
      severity: 'warning'
    }
  ]
}

// Root analytics endpoint
router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    endpoints: [
      '/technical',
      '/risk',
      '/momentum',
      '/performance',
      '/alerts'
    ]
  })
})

// Helper function to get latest prices subquery
const getLatestPricesQuery = () => `
  SELECT p.*
  FROM PRICES p
  INNER JOIN (
    SELECT COIN_ID, MAX(TIMESTAMP) as MAX_TIMESTAMP
    FROM PRICES
    GROUP BY COIN_ID
  ) latest ON p.COIN_ID = latest.COIN_ID AND p.TIMESTAMP = latest.MAX_TIMESTAMP
`

// Performance endpoint
router.get('/performance', async (req, res) => {
  try {
    const data = await getDataWithFallback(
      'performance',
      `
      SELECT 
        h.CATEGORY,
        SUM(h.AMOUNT * p.PRICE_USD) as TOTAL_VALUE,
        COUNT(DISTINCT h.COIN_ID) as NUM_COINS,
        AVG(p.PRICE_CHANGE_24H_PCT) as AVG_24H_CHANGE
      FROM HOLDINGS h
      JOIN (${getLatestPricesQuery()}) p ON h.COIN_ID = p.COIN_ID
      GROUP BY h.CATEGORY
      `,
      (rows) => rows.map(row => ({
        category: row.CATEGORY,
        total_value: row.TOTAL_VALUE,
        num_coins: row.NUM_COINS,
        avg_24h_change: row.AVG_24H_CHANGE
      }))
    )
    res.json({ data })
  } catch (error) {
    console.error('[Analytics] Error in performance endpoint:', error)
    res.status(500).json({ error: 'Failed to fetch analytics' })
  }
})

// Alerts endpoint
router.get('/alerts', async (req, res) => {
  try {
    const data = await getDataWithFallback(
      'alerts',
      `
      SELECT 
        h.SYMBOL,
        p.PRICE_CHANGE_24H_PCT,
        CASE 
          WHEN ABS(p.PRICE_CHANGE_24H_PCT) > 10 THEN 'warning'
          WHEN ABS(p.PRICE_CHANGE_24H_PCT) > 5 THEN 'info'
          ELSE 'low'
        END as SEVERITY
      FROM HOLDINGS h
      JOIN (${getLatestPricesQuery()}) p ON h.COIN_ID = p.COIN_ID
      WHERE ABS(p.PRICE_CHANGE_24H_PCT) > 3
      `,
      (rows) => rows.map(row => ({
        type: 'PRICE_ALERT',
        coin: row.SYMBOL,
        message: `${row.SYMBOL} ${row.PRICE_CHANGE_24H_PCT > 0 ? 'up' : 'down'} ${Math.abs(row.PRICE_CHANGE_24H_PCT).toFixed(1)}% in the last 24h`,
        severity: row.SEVERITY
      }))
    )
    res.json({ data })
  } catch (error) {
    console.error('[Analytics] Error in alerts endpoint:', error)
    res.status(500).json({ error: 'Failed to fetch alerts' })
  }
})

// Technical indicators endpoint
router.get('/technical', async (req, res) => {
  try {
    const data = await getDataWithFallback(
      'technical',
      `
      SELECT 
        h.SYMBOL as COIN,
        p.PRICE_USD,
        p.PRICE_CHANGE_24H_PCT,
        LAG(p.PRICE_USD, 20) OVER (PARTITION BY h.COIN_ID ORDER BY p.TIMESTAMP) as PRICE_20D_AGO,
        LAG(p.PRICE_USD, 50) OVER (PARTITION BY h.COIN_ID ORDER BY p.TIMESTAMP) as PRICE_50D_AGO,
        CASE 
          WHEN p.PRICE_CHANGE_24H_PCT > 5 THEN 'buy'
          WHEN p.PRICE_CHANGE_24H_PCT < -5 THEN 'sell'
          ELSE 'hold'
        END as SIGNAL
      FROM HOLDINGS h
      JOIN (${getLatestPricesQuery()}) p ON h.COIN_ID = p.COIN_ID
      `,
      (rows) => rows.map(row => ({
        coin: row.COIN,
        price_change: row.PRICE_CHANGE_24H_PCT,
        signal: row.SIGNAL,
        sma_20: row.PRICE_20D_AGO || row.PRICE_USD,
        ema_50: row.PRICE_50D_AGO || row.PRICE_USD,
        rsi: calculateRSI(row.PRICE_CHANGE_24H_PCT),
        macd: calculateMACD(row.PRICE_USD, row.PRICE_20D_AGO || row.PRICE_USD)
      }))
    )
    res.json({ data })
  } catch (error) {
    console.error('[Analytics] Error in technical endpoint:', error)
    res.status(500).json({ error: 'Failed to fetch technical indicators' })
  }
})

// Helper functions for technical calculations
const calculateRSI = (priceChange) => {
  // Simple RSI calculation based on 24h price change
  const gain = Math.max(priceChange, 0)
  const loss = Math.abs(Math.min(priceChange, 0))
  const rs = gain / (loss || 1)
  return 100 - (100 / (1 + rs))
}

const calculateMACD = (currentPrice, oldPrice) => {
  // Simple MACD calculation
  return currentPrice - oldPrice
}

// Risk analysis endpoint
router.get('/risk', async (req, res) => {
  try {
    const data = await getDataWithFallback(
      'risk',
      `
      WITH price_stats AS (
        SELECT 
          h.COIN_ID,
          h.SYMBOL,
          p.PRICE_CHANGE_24H_PCT,
          p.VOLUME_24H_USD,
          p.MARKET_CAP_USD,
          p.TIMESTAMP,
          STDDEV(p.PRICE_CHANGE_24H_PCT) OVER (
            PARTITION BY h.COIN_ID 
            ORDER BY p.TIMESTAMP 
            ROWS BETWEEN 7 PRECEDING AND CURRENT ROW
          ) as VOLATILITY_7D,
          MIN(p.PRICE_CHANGE_24H_PCT) OVER (
            PARTITION BY h.COIN_ID 
            ORDER BY p.TIMESTAMP 
            ROWS BETWEEN 7 PRECEDING AND CURRENT ROW
          ) as MIN_CHANGE_7D,
          MAX(p.PRICE_CHANGE_24H_PCT) OVER (
            PARTITION BY h.COIN_ID 
            ORDER BY p.TIMESTAMP 
            ROWS BETWEEN 7 PRECEDING AND CURRENT ROW
          ) as MAX_CHANGE_7D
        FROM HOLDINGS h
        JOIN PRICES p ON h.COIN_ID = p.COIN_ID
      ),
      latest_stats AS (
        SELECT 
          ps.*,
          ROW_NUMBER() OVER (PARTITION BY COIN_ID ORDER BY TIMESTAMP DESC) as rn
        FROM price_stats ps
      )
      SELECT 
        SYMBOL,
        CASE 
          WHEN VOLATILITY_7D > 10 THEN 'HIGH_RISK'
          WHEN VOLATILITY_7D > 5 THEN 'MEDIUM_RISK'
          ELSE 'LOW_RISK'
        END as RISK_CATEGORY,
        VOLATILITY_7D as DAILY_VOLATILITY,
        VOLUME_24H_USD / NULLIF(MARKET_CAP_USD, 0) as VOLUME_TO_MCAP_RATIO,
        MAX_CHANGE_7D as MAX_7D_RETURN,
        MIN_CHANGE_7D as MIN_7D_RETURN,
        ABS(MIN_CHANGE_7D) as MAX_DRAWDOWN
      FROM latest_stats
      WHERE rn = 1
      `,
      (rows) => rows.map(row => ({
        SYMBOL: row.SYMBOL,
        RISK_CATEGORY: row.RISK_CATEGORY,
        DAILY_VOLATILITY: parseFloat(row.DAILY_VOLATILITY || 0).toFixed(2),
        VOLUME_TO_MCAP_RATIO: parseFloat(row.VOLUME_TO_MCAP_RATIO || 0).toFixed(4),
        MAX_7D_RETURN: parseFloat(row.MAX_7D_RETURN || 0).toFixed(2),
        MIN_7D_RETURN: parseFloat(row.MIN_7D_RETURN || 0).toFixed(2),
        MAX_DRAWDOWN: parseFloat(row.MAX_DRAWDOWN || 0).toFixed(2)
      }))
    )
    res.json({ data })
  } catch (error) {
    console.error('[Analytics] Error in risk endpoint:', error)
    res.status(500).json({ error: 'Failed to fetch risk analytics' })
  }
})

// Momentum endpoint
router.get('/momentum', async (req, res) => {
  try {
    const data = await getDataWithFallback(
      'momentum',
      `
      WITH price_momentum AS (
        SELECT 
          h.SYMBOL as COIN,
          p.PRICE_CHANGE_24H_PCT,
          p.TIMESTAMP,
          AVG(p.PRICE_CHANGE_24H_PCT) OVER (
            PARTITION BY h.COIN_ID 
            ORDER BY p.TIMESTAMP 
            ROWS BETWEEN 7 PRECEDING AND CURRENT ROW
          ) as AVG_CHANGE_7D
        FROM HOLDINGS h
        JOIN PRICES p ON h.COIN_ID = p.COIN_ID
      ),
      latest_momentum AS (
        SELECT 
          pm.*,
          ROW_NUMBER() OVER (PARTITION BY COIN ORDER BY TIMESTAMP DESC) as rn
        FROM price_momentum pm
      )
      SELECT 
        COIN,
        PRICE_CHANGE_24H_PCT / 100 as MOMENTUM_SCORE,
        CASE 
          WHEN AVG_CHANGE_7D > 0 THEN 'bullish'
          ELSE 'bearish'
        END as TREND,
        CASE 
          WHEN ABS(AVG_CHANGE_7D) > 10 THEN 'strong'
          WHEN ABS(AVG_CHANGE_7D) > 5 THEN 'moderate'
          ELSE 'weak'
        END as STRENGTH
      FROM latest_momentum
      WHERE rn = 1
      `,
      (rows) => rows.map(row => ({
        coin: row.COIN,
        momentum_score: parseFloat(row.MOMENTUM_SCORE || 0).toFixed(2),
        trend: row.TREND,
        strength: row.STRENGTH
      }))
    )
    res.json({ data })
  } catch (error) {
    console.error('[Analytics] Error in momentum endpoint:', error)
    res.status(500).json({ error: 'Failed to fetch momentum data' })
  }
})

export default router 