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
      
      const syncPayload = {
        holdings: holdings.map(h => ({
          ...h,
          current_price: prices[h.coinId]?.usd || 0,
          price_change_24h: prices[h.coinId]?.usd_24h_change || 0,
          market_cap: prices[h.coinId]?.usd_market_cap || 0,
          volume_24h: prices[h.coinId]?.usd_24h_vol || 0
        })),
        prices
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