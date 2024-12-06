import snowflake from 'snowflake-sdk'

export const validateSnowflakeConfig = () => {
  const requiredVars = [
    'SNOWFLAKE_ACCOUNT',
    'SNOWFLAKE_USERNAME',
    'SNOWFLAKE_PASSWORD',
    'SNOWFLAKE_DATABASE',
    'SNOWFLAKE_WAREHOUSE',
    'SNOWFLAKE_ROLE',
    'SNOWFLAKE_REGION'
  ]
  
  const missingVars = requiredVars.filter(varName => !process.env[varName])
  if (missingVars.length > 0) {
    console.error('Missing required Snowflake environment variables:', missingVars)
    return false
  }
  return true
}

export const getSnowflakeConnection = () => {
  return new Promise((resolve, reject) => {
    if (!validateSnowflakeConfig()) {
      reject(new Error('Snowflake configuration is incomplete'))
      return
    }

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

export const syncData = async (holdings, prices) => {
  try {
    console.log('Starting Snowflake sync...')
    const connection = await getSnowflakeConnection()

    // Begin transaction
    await new Promise((resolve, reject) => {
      connection.execute({
        sqlText: 'BEGIN',
        complete: (err) => err ? reject(err) : resolve()
      })
    })

    try {
      // Clear existing holdings
      await new Promise((resolve, reject) => {
        connection.execute({
          sqlText: 'DELETE FROM HOLDINGS',
          complete: (err) => err ? reject(err) : resolve()
        })
      })

      // Insert new holdings
      for (const holding of holdings) {
        await new Promise((resolve, reject) => {
          connection.execute({
            sqlText: `
              INSERT INTO HOLDINGS (
                COIN_ID,
                SYMBOL,
                NAME,
                AMOUNT,
                CATEGORY
              ) VALUES (?, ?, ?, ?, ?)
            `,
            binds: [
              holding.coin_id,
              holding.symbol,
              holding.name,
              holding.amount,
              holding.category || 'Other'
            ],
            complete: (err) => err ? reject(err) : resolve()
          })
        })
      }

      // Insert new prices
      const timestamp = new Date().toISOString()
      for (const price of prices) {
        await new Promise((resolve, reject) => {
          connection.execute({
            sqlText: `
              INSERT INTO PRICES (
                COIN_ID,
                TIMESTAMP,
                PRICE_USD,
                MARKET_CAP_USD,
                VOLUME_24H_USD,
                PRICE_CHANGE_24H_PCT
              ) VALUES (?, ?, ?, ?, ?, ?)
            `,
            binds: [
              price.coin_id,
              timestamp,
              price.price_usd,
              price.market_cap_usd || 0,
              price.volume_24h_usd || 0,
              price.price_change_24h_pct || 0
            ],
            complete: (err) => err ? reject(err) : resolve()
          })
        })
      }

      // Commit transaction
      await new Promise((resolve, reject) => {
        connection.execute({
          sqlText: 'COMMIT',
          complete: (err) => err ? reject(err) : resolve()
        })
      })

      console.log('✅ Sync completed successfully!')
      return {
        status: 'success',
        message: 'Data synced successfully',
        details: {
          holdings_count: holdings.length,
          prices_count: prices.length,
          timestamp: timestamp
        }
      }
    } catch (error) {
      // Rollback on error
      await new Promise((resolve) => {
        connection.execute({
          sqlText: 'ROLLBACK',
          complete: () => resolve()
        })
      })
      throw error
    } finally {
      connection.destroy((err) => {
        if (err) console.error('Error destroying connection:', err)
      })
    }
  } catch (error) {
    console.error('Error syncing data:', error)
    return {
      status: 'error',
      message: error.message,
      details: {
        type: error.name,
        stack: error.stack
      }
    }
  }
} 