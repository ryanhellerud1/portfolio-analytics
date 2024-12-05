import { useQuery } from '@tanstack/react-query'
import { cryptoApi } from '../services/cryptoApi'

export function useCryptoData() {
  return useQuery({
    queryKey: ['cryptos'],
    queryFn: cryptoApi.getTopCryptos,
    refetchInterval: 30000 // Refetch every 30 seconds
  })
} 