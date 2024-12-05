export const validateCoinId = (id) => {
  // Known mappings
  const idMap = {
    'ripple': 'xrp',
    'dogecoin': 'doge',
    'chainlink': 'chainlink',
    // Add more as needed
  }

  return idMap[id.toLowerCase()] || id.toLowerCase()
} 