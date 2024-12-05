import { createContext, useContext, useState, useEffect } from 'react'
import { cryptoApi } from '../services/cryptoApi'
import { validateCoinId } from '../utils/coinUtils'

const CryptoContext = createContext()

export const useCrypto = () => {
  const context = useContext(CryptoContext)
  if (!context) {
    throw new Error('useCrypto must be used within a CryptoProvider')
  }
  return context
}

export default function CryptoProvider({ children }) {
  const [holdings, setHoldings] = useState(() => {
    const saved = localStorage.getItem('cryptoHoldings')
    return saved ? JSON.parse(saved) : []
  })
  const [watchlist, setWatchlist] = useState(() => {
    const saved = localStorage.getItem('cryptoWatchlist')
    return saved ? JSON.parse(saved) : []
  })
  const [prices, setPrices] = useState({})
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    localStorage.setItem('cryptoHoldings', JSON.stringify(holdings))
  }, [holdings])

  useEffect(() => {
    localStorage.setItem('cryptoWatchlist', JSON.stringify(watchlist))
  }, [watchlist])

  useEffect(() => {
    let isMounted = true
    let fetchTimeout

    const fetchPrices = async () => {
      try {
        // Collect all unique coin IDs from holdings and watchlist
        const allCoinIds = new Set([
          ...holdings.map(h => h.coinId),
          ...watchlist.map(w => w.id)
        ])

        if (allCoinIds.size === 0) {
          setPrices({})
          return
        }

        setIsLoading(true)
        const priceData = await cryptoApi.getPrices([...allCoinIds])
        if (isMounted) {
          setPrices(priceData)
        }
      } catch (error) {
        console.error('Failed to fetch prices:', error)
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    fetchPrices()

    // Set up auto-refresh
    const refreshInterval = setInterval(fetchPrices, 60000) // Refresh every minute

    return () => {
      isMounted = false
      clearInterval(refreshInterval)
      if (fetchTimeout) clearTimeout(fetchTimeout)
    }
  }, [holdings, watchlist])

  const addToWatchlist = (crypto) => {
    setWatchlist(prev => {
      if (prev.some(coin => coin.id === crypto.id)) return prev
      return [...prev, {
        id: crypto.id,
        coinId: crypto.id,
        symbol: crypto.symbol.toUpperCase(),
        name: crypto.name,
        thumb: crypto.thumb
      }]
    })
    return true
  }

  const removeFromWatchlist = (coinId) => {
    setWatchlist(prev => prev.filter(coin => coin.id !== coinId))
  }

  const updateHolding = (updatedHolding) => {
    setHoldings(prev => prev.map(h => 
      h.id === updatedHolding.id 
        ? {
            ...updatedHolding,
            category: updatedHolding.category || 'Other'
          }
        : h
    ))
  }

  return (
    <CryptoContext.Provider value={{
      holdings,
      watchlist,
      prices,
      isLoading,
      addHolding: (newHolding) => setHoldings(prev => [...prev, newHolding]),
      removeHolding: (id) => setHoldings(prev => prev.filter(h => h.id !== id)),
      updateHolding,
      addToWatchlist,
      removeFromWatchlist
    }}>
      {children}
    </CryptoContext.Provider>
  )
} 