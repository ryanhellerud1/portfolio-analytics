import snowflake from 'snowflake-sdk'

export const get_snowflake_connection = () => {
  return new Promise((resolve, reject) => {
    try {
      const account = process.env.SNOWFLAKE_ACCOUNT
      const region = process.env.SNOWFLAKE_REGION
      
      // Format account identifier correctly for Snowflake
      const account_identifier = account.includes('.') ? account : `${account}.${region}`
      
      console.log('Connecting to Snowflake with:', {
        account: account_identifier,
        region,
        warehouse: process.env.SNOWFLAKE_WAREHOUSE,
        database: process.env.SNOWFLAKE_DATABASE,
        schema: process.env.SNOWFLAKE_SCHEMA || 'PUBLIC',
        role: process.env.SNOWFLAKE_ROLE
      })
      
      const connection = snowflake.createConnection({
        account: account,  // Use just the account name
        region: region,    // Specify region separately
        username: process.env.SNOWFLAKE_USERNAME,
        password: process.env.SNOWFLAKE_PASSWORD,
        warehouse: process.env.SNOWFLAKE_WAREHOUSE,
        database: process.env.SNOWFLAKE_DATABASE,
        schema: process.env.SNOWFLAKE_SCHEMA || 'PUBLIC',
        role: process.env.SNOWFLAKE_ROLE
      })

      connection.connect((err, conn) => {
        if (err) {
          console.error('Snowflake connection error:', err)
          reject(err)
        } else {
          console.log('✅ Successfully connected to Snowflake')
          resolve(conn)
        }
      })
    } catch (error) {
      console.error('Snowflake setup error:', error)
      reject(error)
    }
  })
}

export const syncData = async (holdings, prices) => {
  let connection
  try {
    connection = await get_snowflake_connection()
    
    // Begin transaction
    await executeStatement(connection, 'BEGIN')
    
    try {
      // Clear existing holdings
      await executeStatement(connection, 'DELETE FROM HOLDINGS')
      
      // Insert new holdings
      for (const holding of holdings) {
        await executeStatement(
          connection,
          `INSERT INTO HOLDINGS (COIN_ID, SYMBOL, NAME, AMOUNT, CATEGORY)
           VALUES (?, ?, ?, ?, ?)`,
          [holding.coin_id, holding.symbol, holding.name, holding.amount, holding.category || 'Other']
        )
      }
      
      // Insert new prices
      const timestamp = new Date().toISOString()
      for (const price of prices) {
        await executeStatement(
          connection,
          `INSERT INTO PRICES (COIN_ID, TIMESTAMP, PRICE_USD, MARKET_CAP_USD, VOLUME_24H_USD, PRICE_CHANGE_24H_PCT)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            price.coin_id,
            timestamp,
            price.price_usd,
            price.market_cap_usd || 0,
            price.volume_24h_usd || 0,
            price.price_change_24h_pct || 0
          ]
        )
      }
      
      // Commit transaction
      await executeStatement(connection, 'COMMIT')
      
      return {
        status: 'success',
        message: 'Data synced successfully',
        details: {
          holdings_count: holdings.length,
          prices_count: prices.length,
          timestamp
        }
      }
    } catch (error) {
      // Rollback on error
      await executeStatement(connection, 'ROLLBACK')
      throw error
    }
  } catch (error) {
    console.error('Error syncing data:', error)
    return {
      status: 'error',
      message: `Error syncing data: ${error.message}`,
      details: {
        type: error.name,
        message: error.message,
        stack: error.stack
      }
    }
  } finally {
    if (connection) {
      connection.destroy()
    }
  }
}

const executeStatement = (connection, sql, binds = []) => {
  return new Promise((resolve, reject) => {
    connection.execute({
      sqlText: sql,
      binds: binds,
      complete: (err, stmt, rows) => {
        if (err) {
          reject(err)
        } else {
          resolve(rows)
        }
      }
    })
  })
}

export const validateSnowflakeConfig = () => {
  const requiredEnvVars = [
    'SNOWFLAKE_ACCOUNT',
    'SNOWFLAKE_USERNAME',
    'SNOWFLAKE_PASSWORD',
    'SNOWFLAKE_DATABASE',
    'SNOWFLAKE_WAREHOUSE',
    'SNOWFLAKE_ROLE',
    'SNOWFLAKE_REGION'
  ]

  const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName])
  if (missingEnvVars.length > 0) {
    console.warn('Missing Snowflake environment variables:', missingEnvVars)
    return false
  }

  // Additional validation for account and region format
  const account = process.env.SNOWFLAKE_ACCOUNT
  const region = process.env.SNOWFLAKE_REGION
  
  if (!account || !region) {
    console.warn('Invalid Snowflake account or region format')
    return false
  }

  return true
} 