export const COIN_CLASSIFICATIONS = {
  // Layer 1 & Layer 2
  'bitcoin': 'Layer 1',
  'btc': 'Layer 1',
  'ethereum': 'Layer 1',
  'eth': 'Layer 1',
  'xrp': 'Layer 1',
  'ripple': 'Layer 1',
  
  // DeFi & Oracles
  'chainlink': 'Oracle',
  'chain-link': 'Oracle',
  'link': 'Oracle',
  
  // Meme Coins
  'dogecoin': 'Meme',
  'doge': 'Meme',
  'luckycoin': 'Meme',
  'lucky-coin': 'Meme',
  'lucky': 'Meme',
  'lucky-block': 'Meme',
  'shiba-inu': 'Meme',
  'shib': 'Meme',
  'pepe': 'Meme',
  
  // IoT & Data
  'jasmy': 'IoT',
  'jasmycoin': 'IoT',
  'jasmy-coin': 'IoT',
  
  // AI & ML
  'fetch-ai': 'AI',
  'singularitynet': 'AI',
  'ocean-protocol': 'AI',
  'numeraire': 'AI',
  'cortex': 'AI',
  'matrix-ai': 'AI',
  'deepbrain-chain': 'AI',
  'graphlinq-protocol': 'AI',
  'fetch': 'AI',
  'agix': 'AI',
  'ocean': 'AI',
  'nmr': 'AI',
  'ctxc': 'AI',
  'man': 'AI',
  'dbc': 'AI',
  'glq': 'AI',
  
  // Utility Tokens
  'theme-coin': 'Utility',
  'tema': 'Utility',
  'theme': 'Utility'
}

// Helper function to normalize coin IDs
function normalizeCoinId(id) {
  if (!id) return ''
  return id.toLowerCase()
    .replace(/[_\s-]+/g, '') // Remove all underscores, spaces, and hyphens
    .replace(/coin$/i, '')    // Remove 'coin' suffix
    .trim()
}

// Updated debug helper with more info
export function debugClassification(coinId) {
  const normalizedId = normalizeCoinId(coinId)
  
  // Try to find a match
  const matchingKey = Object.keys(COIN_CLASSIFICATIONS).find(key => 
    normalizeCoinId(key) === normalizedId
  )
  
  const classification = matchingKey ? COIN_CLASSIFICATIONS[matchingKey] : 'Other'
  
  // Log detailed debug info
  console.log({
    original: coinId,
    normalized: normalizedId,
    matchingKey,
    classification,
    allKeys: Object.keys(COIN_CLASSIFICATIONS).map(k => normalizeCoinId(k))
  })
  
  return classification
}

// Add a function to help debug coin IDs
export function debugCoinId(coinId) {
  const normalized = normalizeCoinId(coinId)
  const possibleMatches = Object.keys(COIN_CLASSIFICATIONS)
    .filter(key => normalizeCoinId(key).includes(normalized) || 
                   normalized.includes(normalizeCoinId(key)))
  
  return {
    original: coinId,
    normalized,
    possibleMatches,
    classification: debugClassification(coinId)
  }
}

export const CLASSIFICATION_COLORS = {
  'Layer 1': '#FF6384',    // Pink
  'Layer 2': '#36A2EB',    // Blue
  'DeFi': '#4BC0C0',       // Teal
  'Meme': '#FFCD56',       // Yellow
  'Oracle': '#FF9F40',     // Orange
  'IoT': '#9966FF',        // Purple
  'AI': '#8B4513',         // Brown
  'Gaming': '#FF99CC',     // Light Pink
  'Utility': '#4BCFB5',    // Mint
  'Other': '#C9CBCF'       // Gray
}

// Simplified categories system
export const CATEGORIES = {
  'Layer 1': {
    name: 'Layer 1',
    color: '#FF6384'
  },
  'Layer 2': {
    name: 'Layer 2',
    color: '#36A2EB'
  },
  'DeFi': {
    name: 'DeFi',
    color: '#4BC0C0'
  },
  'Meme': {
    name: 'Meme',
    color: '#FFCD56'
  },
  'Oracle': {
    name: 'Oracle',
    color: '#FF9F40'
  },
  'IoT': {
    name: 'IoT',
    color: '#9966FF'
  },
  'AI': {
    name: 'AI',
    color: '#8B4513'
  },
  'Gaming': {
    name: 'Gaming',
    color: '#FF99CC'
  },
  'Utility': {
    name: 'Utility',
    color: '#4BCFB5'
  },
  'Other': {
    name: 'Other',
    color: '#C9CBCF'
  }
}

// Category mapping rules
const CATEGORY_RULES = {
  'layer-1': ['platform', 'blockchain', 'layer-1', 'smart-contract-platform'],
  'defi': ['defi', 'decentralized-finance', 'yield-farming', 'yield-aggregator'],
  'meme': ['meme', 'memes', 'dog', 'inu', 'shib', 'doge'],
  'gaming': ['gaming', 'play-to-earn', 'metaverse', 'gaming-platform'],
  'oracle': ['oracle', 'data-provision'],
  'iot': ['iot', 'internet-of-things'],
  'privacy': ['privacy', 'anonymous', 'privacy-coins'],
  'exchange': ['exchange', 'dex', 'centralized-exchange'],
  'infrastructure': ['infrastructure', 'interoperability', 'scaling'],
  'ai': ['ai', 'artificial-intelligence', 'machine-learning', 'neural', 'deep-learning', 'gpt', 'llm']
}

// Function to standardize category names
function standardizeCategory(category) {
  // Map of special cases
  const categoryMap = {
    'ai': 'AI',
    'iot': 'IoT',
    'defi': 'DeFi',
    'layer-1': 'Layer 1',
    'layer-2': 'Layer 2'
  }

  // First normalize the category
  const normalized = category.toLowerCase().trim()
  
  // Return mapped category or capitalize first letter
  return categoryMap[normalized] || 
         category.charAt(0).toUpperCase() + category.slice(1)
}

// Update classifyCoin function
export async function classifyCoin(coinId) {
  try {
    const normalizedId = normalizeCoinId(coinId)
    
    // First check our mappings
    const matchingKey = Object.keys(COIN_CLASSIFICATIONS).find(key => 
      normalizeCoinId(key) === normalizedId
    )
    
    if (matchingKey) {
      return standardizeCategory(COIN_CLASSIFICATIONS[matchingKey])
    }

    // If no direct match, try API and category rules
    const response = await fetch(`http://localhost:3001/api/coins/${coinId}`)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data = await response.json()

    // Extract metadata and try to classify
    const metadata = {
      categories: data.categories || [],
      description: data.description?.en?.toLowerCase() || '',
      tags: data.tags || [],
      name: data.name.toLowerCase(),
      symbol: data.symbol.toLowerCase()
    }

    // Try category rules
    for (const [category, keywords] of Object.entries(CATEGORY_RULES)) {
      if (matchesCategory(metadata, keywords)) {
        return standardizeCategory(category)
      }
    }

    // Try guessing based on name/symbol
    const guessedCategory = guessClassification(coinId, metadata.name, metadata.symbol)
    if (guessedCategory !== 'Other') {
      return standardizeCategory(guessedCategory)
    }

    return 'Other'
  } catch (error) {
    console.error(`Error classifying coin ${coinId}:`, error)
    // Try guessing as last resort
    return standardizeCategory(guessClassification(coinId))
  }
}

// Helper function to check if a coin is a meme coin
function isMemeCoin(metadata) {
  const memeIndicators = ['meme', 'dog', 'inu', 'shib', 'doge', 'elon', 'moon']
  
  return memeIndicators.some(indicator => 
    metadata.name.includes(indicator) ||
    metadata.symbol.includes(indicator) ||
    metadata.categories.some(cat => cat.toLowerCase().includes(indicator)) ||
    metadata.description.includes(indicator)
  )
}

// Helper function to match metadata against category keywords
function matchesCategory(metadata, keywords) {
  const searchText = [
    ...metadata.categories,
    ...metadata.tags,
    metadata.name,
    metadata.symbol,
    metadata.description
  ].join(' ').toLowerCase()

  return keywords.some(keyword => searchText.includes(keyword))
}

// Cache for classifications to avoid repeated API calls
const classificationCache = new Map()

// Function to get classification with caching
export async function getCoinClassification(coinId) {
  try {
    // Check cache first
    if (classificationCache.has(coinId)) {
      return classificationCache.get(coinId)
    }

    // Try static mappings
    if (COIN_CLASSIFICATIONS[coinId]) {
      return COIN_CLASSIFICATIONS[coinId]
    }

    // Try API classification
    const classification = await classifyCoin(coinId)
    classificationCache.set(coinId, classification)
    return classification
  } catch (error) {
    console.error(`Failed to classify ${coinId}:`, error)
    // Return static mapping or guess based on coin ID
    return COIN_CLASSIFICATIONS[coinId] || guessClassification(coinId)
  }
}

// Update guessClassification function
function guessClassification(coinId, name = '', symbol = '') {
  const text = `${coinId} ${name} ${symbol}`.toLowerCase()
  
  // Simple rule-based classification
  if (text.match(/inu|doge|pepe|shib|moon|elon|safe|baby/)) return 'Meme'
  if (text.match(/chain|link|oracle/)) return 'Oracle'
  if (text.match(/swap|dex|exchange/)) return 'DeFi'
  if (text.match(/game|play|meta|verse/)) return 'Gaming'
  if (text.match(/iot|device|sensor/)) return 'IoT'
  if (text.match(/ai|gpt|neural|intelligence|ml|learn/)) return 'AI'
  
  return 'Other'
}

// Add debug logging to getHoldingClassifications
export async function getHoldingClassifications(holdings) {
  const classifications = {}
  
  for (const holding of holdings) {
    const classification = await getCoinClassification(holding.coinId)
    classifications[holding.coinId] = standardizeCategory(classification)
    console.log(`Classified ${holding.coinId} as ${classifications[holding.coinId]}`)
  }
  
  return classifications
} 