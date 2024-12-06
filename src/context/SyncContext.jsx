import { createContext, useContext, useState } from 'react'
import { useCrypto } from './CryptoContext'
import { apiService } from '../services/apiService'

const SyncContext = createContext()

export function SyncProvider({ children }) {
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState(null)
  const { holdings, prices } = useCrypto()

  const triggerSync = async () => {
    if (isSyncing) return
    
    try {
      setIsSyncing(true)
      console.log('Starting Snowflake sync...')
      console.log('Current prices:', prices)
      
      // Format holdings data
      const formattedHoldings = holdings.map(h => ({
        coin_id: h.coinId,
        symbol: h.symbol,
        name: h.name,
        amount: h.amount,
        category: h.category
      }))

      // Format prices data
      const formattedPrices = Object.entries(prices).map(([coinId, data]) => ({
        coin_id: coinId,
        price_usd: data.usd,
        market_cap_usd: data.usd_market_cap,
        volume_24h_usd: data.usd_24h_vol,
        price_change_24h_pct: data.usd_24h_change
      }))
      
      const syncPayload = {
        holdings: formattedHoldings,
        prices: formattedPrices
      }
      
      console.log('Sync payload:', syncPayload)
      
      const response = await apiService.syncSnowflake(syncPayload.holdings, syncPayload.prices)
      console.log('Sync response:', response)
      
      setLastSyncTime(new Date().toISOString())
    } catch (error) {
      console.error('Sync error:', error)
      throw error
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <SyncContext.Provider value={{ isSyncing, lastSyncTime, triggerSync }}>
      {children}
    </SyncContext.Provider>
  )
}

export function useSync() {
  const context = useContext(SyncContext)
  if (!context) {
    throw new Error('useSync must be used within a SyncProvider')
  }
  return context
} 