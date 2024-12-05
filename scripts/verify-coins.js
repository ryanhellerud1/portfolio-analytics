const testCoins = [
  'xrp',
  'jasmycoin',
  'tema',
  'luckycoin',
  'dogecoin',
  'chainlink'
]

// Known working IDs from CoinGecko
const COIN_MAPPINGS = {
  'xrp': 'ripple',
  'dogecoin': 'dogecoin',
  'chainlink': 'chainlink',
  'jasmycoin': 'jasmy',
  'tema': 'theme-coin',
  'luckycoin': 'lucky-block'
}

async function makeRequest(url) {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    // Check for common VPN/network related errors
    const errorMessage = error.message.toLowerCase()
    const isNetworkError = errorMessage.includes('network') || 
                          errorMessage.includes('fetch failed') ||
                          errorMessage.includes('timeout')

    return { 
      success: false, 
      error: {
        message: error.message,
        status: error.status,
        type: error.type,
        isNetworkError
      }
    }
  }
}

async function testApi() {
  console.log('Testing API with Bitcoin price...')
  console.log('Note: If using a VPN, you might need to disable it')
  
  const result = await makeRequest(
    'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd'
  )
  
  if (result.success) {
    console.log('✅ API test successful:', result.data)
    return true
  } else {
    console.error('❌ API test failed:', result.error)
    if (result.error.isNetworkError) {
      console.error(`
        Network error detected. Common solutions:
        1. Disable VPN if you're using one
        2. Try a different network connection
        3. Check your firewall settings
        4. Verify DNS settings
      `)
    }
    return false
  }
}

async function verifyCoin(coinId) {
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24h_vol=true&include_24h_change=true`
  console.log(`Testing URL: ${url}`)
  return await makeRequest(url)
}

async function verifyAllCoins() {
  // Test API first
  const apiAvailable = await testApi()
  if (!apiAvailable) {
    return
  }

  console.log('\nStarting coin verification...')
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
  const results = {}
  let successCount = 0
  let failCount = 0

  for (const [symbol, coinId] of Object.entries(COIN_MAPPINGS)) {
    console.log(`\nChecking ${symbol} => ${coinId} (${successCount} successes, ${failCount} failures)`)
    
    const result = await verifyCoin(coinId)
    if (result.success) {
      console.log('✅ Valid:', result.data)
      results[symbol] = {
        id: coinId,
        price: result.data[coinId]?.usd,
        volume_24h: result.data[coinId]?.usd_24h_vol,
        change_24h: result.data[coinId]?.usd_24h_change
      }
      successCount++
    } else {
      console.log('❌ Failed:', result.error)
      failCount++
      if (failCount >= 3) {
        console.log('Multiple failures detected - might be a rate limit or network issue')
        break
      }
    }

    // Wait between requests
    console.log('Waiting 10 seconds...')
    await delay(10000)
  }

  // Print summary
  console.log('\n📊 Results Summary:')
  console.log(`Successes: ${successCount}, Failures: ${failCount}`)
  console.log(JSON.stringify(results, null, 2))

  if (Object.keys(results).length > 0) {
    console.log('\n✨ Valid coin mappings to use:')
    console.log('{\n' + Object.entries(results)
      .map(([symbol, data]) => `  '${symbol}': '${data.id}',`)
      .join('\n') + '\n}')
  }
}

// Run the verification
console.log('🚀 Starting CoinGecko verification...')
verifyAllCoins().catch(error => {
  console.error('Script failed:', {
    name: error.name,
    message: error.message,
    stack: error.stack
  })
}) 