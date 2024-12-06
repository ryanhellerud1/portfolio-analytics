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