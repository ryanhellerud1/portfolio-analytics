import { ChakraProvider } from '@chakra-ui/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import CryptoProvider from './context/CryptoContext'
import Dashboard from './components/dashboard/Dashboard'
import { SyncProvider } from './context/SyncContext'

const queryClient = new QueryClient()

function App() {
  return (
    <ChakraProvider>
      <QueryClientProvider client={queryClient}>
        <SyncProvider>
          <CryptoProvider>
            <Dashboard />
          </CryptoProvider>
        </SyncProvider>
      </QueryClientProvider>
    </ChakraProvider>
  )
}

export default App 