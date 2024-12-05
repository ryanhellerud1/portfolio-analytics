import express from 'express'
import { get_snowflake_connection, validateSnowflakeConfig } from '../utils/snowflake.js'

const router = express.Router()

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
      metric: 'Portfolio Beta',
      value: 1.2,
      status: 'moderate'
    },
    {
      metric: 'Volatility',
      value: 0.45,
      status: 'high'
    },
    {
      metric: 'Sharpe Ratio',
      value: 1.8,
      status: 'good'
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
const getDataWithFallback = async (endpoint, sqlQuery, formatFunction) => {
  // Check if Snowflake is configured
  if (!validateSnowflakeConfig()) {
    console.log(`Snowflake not configured, returning mock data for ${endpoint}`)
    return mockData[endpoint]
  }

  let connection
  try {
    connection = await get_snowflake_connection()
    const data = await new Promise((resolve, reject) => {
      connection.execute({
        sqlText: sqlQuery,
        complete: (err, stmt, rows) => {
          if (err) reject(err)
          else resolve(formatFunction ? formatFunction(rows) : rows)
        }
      })
    })
    return data
  } catch (error) {
    console.error(`Error fetching ${endpoint} data:`, error)
    return mockData[endpoint]
  } finally {
    if (connection) await connection.destroy()
  }
}

// Performance endpoint
router.get('/performance', async (req, res) => {
  try {
    const data = await getDataWithFallback(
      'performance',
      'SELECT * FROM PORTFOLIO_PERFORMANCE',
      rows => rows.map(row => ({
        category: row.CATEGORY || 'Other',
        total_value: parseFloat(row.TOTAL_VALUE) || 0,
        percentage: parseFloat(row.PERCENTAGE) || 0,
        num_coins: parseInt(row.NUM_COINS) || 0,
        avg_24h_change: parseFloat(row.AVG_24H_CHANGE) || 0
      }))
    )
    res.json({ data })
  } catch (error) {
    console.error('Error in performance endpoint:', error)
    res.status(500).json({ error: 'Failed to fetch analytics' })
  }
})

// Alerts endpoint
router.get('/alerts', async (req, res) => {
  try {
    const data = await getDataWithFallback('alerts', 'SELECT * FROM PRICE_ALERTS')
    res.json({ data })
  } catch (error) {
    console.error('Error in alerts endpoint:', error)
    res.status(500).json({ error: 'Failed to fetch alerts' })
  }
})

// Technical indicators endpoint
router.get('/technical', async (req, res) => {
  try {
    const data = await getDataWithFallback(
      'technical',
      `SELECT * FROM TECHNICAL_INDICATORS 
       WHERE TIMESTAMP >= DATEADD(day, -7, CURRENT_TIMESTAMP())
       ORDER BY TIMESTAMP DESC`
    )
    res.json({ data })
  } catch (error) {
    console.error('Error in technical endpoint:', error)
    res.status(500).json({ error: 'Failed to fetch technical indicators' })
  }
})

// Risk analysis endpoint
router.get('/risk', async (req, res) => {
  try {
    const data = await getDataWithFallback(
      'risk',
      `SELECT * FROM PORTFOLIO_RISK_ANALYSIS
       WHERE DATE >= DATEADD(day, -30, CURRENT_DATE())
       ORDER BY DATE DESC`
    )
    res.json({ data })
  } catch (error) {
    console.error('Error in risk endpoint:', error)
    res.status(500).json({ error: 'Failed to fetch risk analysis' })
  }
})

// Momentum endpoint
router.get('/momentum', async (req, res) => {
  try {
    const data = await getDataWithFallback(
      'momentum',
      `SELECT * FROM PRICE_MOMENTUM
       WHERE TIMESTAMP >= DATEADD(day, -30, CURRENT_TIMESTAMP())
       ORDER BY TIMESTAMP DESC`
    )
    res.json({ data })
  } catch (error) {
    console.error('Error in momentum endpoint:', error)
    res.status(500).json({ error: 'Failed to fetch momentum analysis' })
  }
})

export default router 