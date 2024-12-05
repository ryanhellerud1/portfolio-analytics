import { execSync } from 'child_process'
import path from 'path'
import dotenv from 'dotenv'

dotenv.config()

const projectRoot = process.cwd()
const pythonPath = process.env.PYTHON_PATH.replace('${PWD}', projectRoot)

try {
  console.log('Verifying Python path:', pythonPath)
  const version = execSync(`${pythonPath} --version`).toString()
  console.log('Python version:', version)
  
  const modules = execSync(`${pythonPath} -c "import snowflake.connector, dotenv; print('Required modules found')"`)
  console.log(modules.toString())
  
  console.log('Python path verification successful!')
} catch (error) {
  console.error('Python path verification failed:', error.message)
  process.exit(1)
} 