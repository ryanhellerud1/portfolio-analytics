import {
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Text,
  Divider
} from '@chakra-ui/react'
import { useCryptoData } from '../../hooks/useCryptoData'
import { useCrypto } from '../../context/CryptoContext'

function PriceTracker() {
  const { data: topCryptos, isLoading: topCryptosLoading, error } = useCryptoData()
  const { watchlist, prices, isLoading: pricesLoading } = useCrypto()

  if (topCryptosLoading) return <Text>Loading...</Text>
  if (error) return <Text>Error: {error.message}</Text>

  return (
    <Box borderWidth="1px" borderRadius="lg" p={4}>
      <Text fontSize="xl" mb={4}>Live Prices</Text>
      <Table variant="simple">
        <Thead>
          <Tr>
            <Th>Coin</Th>
            <Th>Price</Th>
            <Th>24h Change</Th>
          </Tr>
        </Thead>
        <Tbody>
          {/* Top Cryptocurrencies */}
          {topCryptos?.map((crypto) => (
            <Tr key={crypto.id}>
              <Td>
                <Text>{crypto.name} ({crypto.symbol.toUpperCase()})</Text>
              </Td>
              <Td>${crypto.current_price.toLocaleString()}</Td>
              <Td color={crypto.price_change_percentage_24h > 0 ? 'green.500' : 'red.500'}>
                {crypto.price_change_percentage_24h.toFixed(2)}%
              </Td>
            </Tr>
          ))}

          {/* Divider between top cryptos and watchlist */}
          {watchlist.length > 0 && (
            <Tr>
              <Td colSpan={3}>
                <Divider my={2} />
                <Text fontSize="sm" color="gray.500">Watched Cryptocurrencies</Text>
              </Td>
            </Tr>
          )}

          {/* Watched Cryptocurrencies */}
          {watchlist.map((coin) => {
            const currentPrice = prices[coin.id]?.usd
            return (
              <Tr key={coin.id}>
                <Td>
                  <Text>{coin.name} ({coin.symbol})</Text>
                </Td>
                <Td>
                  {currentPrice !== undefined 
                    ? `$${currentPrice.toLocaleString()}` 
                    : 'Loading...'}
                </Td>
                <Td>-</Td>
              </Tr>
            )
          })}
        </Tbody>
      </Table>
    </Box>
  )
}

export default PriceTracker 