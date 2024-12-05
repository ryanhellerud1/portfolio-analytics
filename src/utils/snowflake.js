import snowflake from 'snowflake-sdk'

export const get_snowflake_connection = () => {
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

export const validateSnowflakeConfig = () => {
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
    return false
  }
  return true
} 