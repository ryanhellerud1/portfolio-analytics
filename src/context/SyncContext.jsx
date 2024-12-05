import { createContext, useContext, useState } from 'react'

const SyncContext = createContext()

export function SyncProvider({ children }) {
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState(null)

  const triggerSync = async (callback) => {
    setIsSyncing(true)
    try {
      await callback()
      setLastSyncTime(new Date())
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