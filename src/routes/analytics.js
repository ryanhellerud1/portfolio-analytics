import express from 'express'
import { get_snowflake_connection, validateSnowflakeConfig } from '../utils/snowflake.js'

const router = express.Router()

// Debug logging middleware for analytics routes
router.use((req, res, next) => {
  console.log(`[Analytics] Processing ${req.method} ${req.originalUrl}`)
  const isSnowflakeConfigured = validateSnowflakeConfig()
  console.log(`[Analytics] Snowflake configured: ${isSnowflakeConfigured ? '✅' : '❌'}`)
  next()
})

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

// Helper function to handle Snowflake or return mock data
const getDataWithFallback = async (endpoint, sqlQuery, formatFunction = (data) => data) => {
  console.log(`[Analytics] Fetching data for ${endpoint}`)
  
  try {
    if (!validateSnowflakeConfig()) {
      console.log(`[Analytics] ❌ Snowflake not configured, using mock data for ${endpoint}`)
      return mockData[endpoint]
    }

    console.log(`[Analytics] 🔍 Executing query for ${endpoint}:`, sqlQuery)
    const conn = await get_snowflake_connection()
    console.log(`[Analytics] ✅ Connected to Snowflake for ${endpoint}`)

    const result = await new Promise((resolve, reject) => {
      conn.execute({
        sqlText: sqlQuery,
        complete: (err, stmt, rows) => {
          if (err) {
            console.error(`[Analytics] ❌ Query error for ${endpoint}:`, err)
            reject(err)
          } else {
            console.log(`[Analytics] ✅ Query successful for ${endpoint}, got ${rows?.length || 0} rows`)
            resolve(rows)
          }
        }
      })
    })

    if (!result || result.length === 0) {
      console.log(`[Analytics] ⚠️ No data found for ${endpoint}, using mock data`)
      return mockData[endpoint]
    }

    console.log(`[Analytics] 🔄 Transforming data for ${endpoint}`)
    const transformedData = formatFunction(result)
    console.log(`[Analytics] ✅ Data ready for ${endpoint}:`, transformedData)
    return transformedData
  } catch (error) {
    console.error(`[Analytics] ❌ Error fetching data for ${endpoint}:`, error)
    console.log(`[Analytics] ⚠️ Falling back to mock data for ${endpoint}`)
    return mockData[endpoint]
  }
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
`;

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
        h.COIN_ID,
        h.SYMBOL as COIN,
        p.PRICE_CHANGE_24H_PCT as PRICE_CHANGE,
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
        price_change: row.PRICE_CHANGE,
        signal: row.SIGNAL
      }))
    )
    res.json({ data })
  } catch (error) {
    console.error('[Analytics] Error in technical endpoint:', error)
    res.status(500).json({ error: 'Failed to fetch technical indicators' })
  }
})

// Risk analysis endpoint
router.get('/risk', async (req, res) => {
  try {
    const data = await getDataWithFallback(
      'risk',
      `
      SELECT 
        h.COIN_ID,
        h.SYMBOL,
        CASE 
          WHEN p.PRICE_CHANGE_24H_PCT > 10 THEN 'HIGH_RISK'
          WHEN p.PRICE_CHANGE_24H_PCT > 5 THEN 'MEDIUM_RISK'
          ELSE 'LOW_RISK'
        END as RISK_CATEGORY,
        p.PRICE_CHANGE_24H_PCT as DAILY_VOLATILITY,
        p.VOLUME_24H_USD / NULLIF(p.MARKET_CAP_USD, 0) as VOLUME_TO_MCAP_RATIO
      FROM HOLDINGS h
      JOIN (${getLatestPricesQuery()}) p ON h.COIN_ID = p.COIN_ID
      `,
      (rows) => rows.map(row => ({
        SYMBOL: row.SYMBOL,
        RISK_CATEGORY: row.RISK_CATEGORY,
        DAILY_VOLATILITY: row.DAILY_VOLATILITY,
        VOLUME_TO_MCAP_RATIO: row.VOLUME_TO_MCAP_RATIO
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
      SELECT 
        h.SYMBOL as COIN,
        p.PRICE_CHANGE_24H_PCT / 100 as MOMENTUM_SCORE,
        CASE 
          WHEN p.PRICE_CHANGE_24H_PCT > 0 THEN 'bullish'
          ELSE 'bearish'
        END as TREND,
        CASE 
          WHEN ABS(p.PRICE_CHANGE_24H_PCT) > 10 THEN 'strong'
          WHEN ABS(p.PRICE_CHANGE_24H_PCT) > 5 THEN 'moderate'
          ELSE 'weak'
        END as STRENGTH
      FROM HOLDINGS h
      JOIN (${getLatestPricesQuery()}) p ON h.COIN_ID = p.COIN_ID
      `,
      (rows) => rows.map(row => ({
        coin: row.COIN,
        momentum_score: row.MOMENTUM_SCORE,
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