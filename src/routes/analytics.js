import express from 'express'
import { get_snowflake_connection, validateSnowflakeConfig } from '../utils/snowflake.js'

const router = express.Router()

// Debug logging middleware for analytics routes
router.use((req, res, next) => {
  console.log(`[Analytics] Processing ${req.method} ${req.originalUrl}`)
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
const getDataWithFallback = async (endpoint, sqlQuery, formatFunction) => {
  console.log(`[Analytics] Fetching data for ${endpoint}`)
  
  // Always return mock data for now until Snowflake is properly configured
  console.log(`[Analytics] Using mock data for ${endpoint}`)
  return mockData[endpoint]
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

// Performance endpoint
router.get('/performance', async (req, res) => {
  try {
    const data = await getDataWithFallback('performance', 'SELECT * FROM PORTFOLIO_PERFORMANCE')
    res.json({ data })
  } catch (error) {
    console.error('[Analytics] Error in performance endpoint:', error)
    res.status(500).json({ error: 'Failed to fetch analytics' })
  }
})

// Alerts endpoint
router.get('/alerts', async (req, res) => {
  try {
    const data = await getDataWithFallback('alerts', 'SELECT * FROM PRICE_ALERTS')
    res.json({ data })
  } catch (error) {
    console.error('[Analytics] Error in alerts endpoint:', error)
    res.status(500).json({ error: 'Failed to fetch alerts' })
  }
})

// Technical indicators endpoint
router.get('/technical', async (req, res) => {
  try {
    const data = await getDataWithFallback('technical', 'SELECT * FROM TECHNICAL_INDICATORS')
    res.json({ data })
  } catch (error) {
    console.error('[Analytics] Error in technical endpoint:', error)
    res.status(500).json({ error: 'Failed to fetch technical indicators' })
  }
})

// Risk analysis endpoint
router.get('/risk', async (req, res) => {
  try {
    const data = await getDataWithFallback('risk', 'SELECT * FROM PORTFOLIO_RISK_ANALYSIS')
    res.json({ data })
  } catch (error) {
    console.error('[Analytics] Error in risk endpoint:', error)
    res.status(500).json({ error: 'Failed to fetch risk analysis' })
  }
})

// Momentum endpoint
router.get('/momentum', async (req, res) => {
  try {
    const data = await getDataWithFallback('momentum', 'SELECT * FROM PRICE_MOMENTUM')
    res.json({ data })
  } catch (error) {
    console.error('[Analytics] Error in momentum endpoint:', error)
    res.status(500).json({ error: 'Failed to fetch momentum analysis' })
  }
})

export default router 