import {
  Box,
  VStack,
  HStack,
  Input,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  IconButton,
  Text,
  List,
  ListItem,
  useToast,
  useOutsideClick
} from '@chakra-ui/react'
import { DeleteIcon } from '@chakra-ui/icons'
import { useState, useEffect, useRef } from 'react'
import { useCrypto } from '../../context/CryptoContext'
import { cryptoApi } from '../../services/cryptoApi'

function WatchList() {
  const context = useCrypto()
  
  // Return early if context is not available
  if (!context) return null

  const { watchlist, prices, addToWatchlist, removeFromWatchlist } = context
  const [searchInput, setSearchInput] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const searchRef = useRef(null)
  const toast = useToast()

  useOutsideClick({
    ref: searchRef,
    handler: () => setShowDropdown(false),
  })

  // Search cryptocurrencies
  useEffect(() => {
    const searchTimeout = setTimeout(async () => {
      if (searchInput.length >= 2) {
        try {
          const results = await cryptoApi.searchCryptos(searchInput)
          setSearchResults(results.slice(0, 5))
          setShowDropdown(true)
        } catch (error) {
          console.error('Search error:', error)
        }
      } else {
        setSearchResults([])
        setShowDropdown(false)
      }
    }, 500)

    return () => clearTimeout(searchTimeout)
  }, [searchInput])

  // Update the addToWatchlist function to handle the toast notifications
  const handleAddToWatchlist = (crypto) => {
    const success = addToWatchlist(crypto)
    if (success) {
      setSearchInput('')
      setShowDropdown(false)
      toast({
        title: 'Added to watchlist',
        description: `${crypto.name} has been added to your watchlist`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      })
    } else {
      toast({
        title: 'Already in watchlist',
        description: `${crypto.name} is already in your watchlist`,
        status: 'warning',
        duration: 3000,
        isClosable: true,
      })
    }
  }

  return (
    <Box p={4}>
      <VStack spacing={6} align="stretch">
        <Box mb={4}>
          <Text fontSize="2xl" fontWeight="bold" mb={2}>
            Crypto Watch List
          </Text>
          <Text color="gray.600" _dark={{ color: 'gray.300' }} mb={4}>
            Track your favorite cryptocurrencies by adding them to your watch list. Search and add coins to monitor their prices and performance.
          </Text>
        </Box>

        <Box position="relative" ref={searchRef}>
          <HStack>
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search cryptocurrencies..."
              size="md"
            />
          </HStack>
          {showDropdown && searchResults.length > 0 && (
            <List
              position="absolute"
              w="100%"
              bg="white"
              boxShadow="md"
              borderRadius="md"
              mt={1}
              maxH="200px"
              overflowY="auto"
              zIndex={1000}
            >
              {searchResults.map((crypto) => (
                <ListItem
                  key={crypto.id}
                  p={2}
                  cursor="pointer"
                  _hover={{ bg: 'gray.100' }}
                  onClick={() => handleAddToWatchlist(crypto)}
                >
                  <HStack>
                    {crypto.thumb && (
                      <img 
                        src={crypto.thumb} 
                        alt={crypto.name} 
                        style={{ width: '20px', height: '20px' }}
                      />
                    )}
                    <Text>{crypto.name}</Text>
                    <Text color="gray.500">({crypto.symbol.toUpperCase()})</Text>
                  </HStack>
                </ListItem>
              ))}
            </List>
          )}
        </Box>

        <Table variant="simple">
          <Thead>
            <Tr>
              <Th>Name</Th>
              <Th>Symbol</Th>
              <Th>Price</Th>
              <Th>24h Change</Th>
              <Th>Market Cap</Th>
              <Th>Action</Th>
            </Tr>
          </Thead>
          <Tbody>
            {watchlist.map((coin) => {
              const currentPrice = prices[coin.id]?.usd
              const priceChange = prices[coin.id]?.usd_24h_change
              const marketCap = prices[coin.id]?.usd_market_cap
              
              // Function to format market cap
              const formatMarketCap = (marketCap) => {
                if (marketCap === undefined) return '-'
                if (marketCap >= 1e12) return `$${(marketCap / 1e12).toFixed(2)}T`
                if (marketCap >= 1e9) return `$${(marketCap / 1e9).toFixed(2)}B`
                if (marketCap >= 1e6) return `$${(marketCap / 1e6).toFixed(2)}M`
                return `$${marketCap.toLocaleString()}`
              }

              return (
                <Tr key={coin.id}>
                  <Td>{coin.name}</Td>
                  <Td>{coin.symbol}</Td>
                  <Td>
                    {currentPrice !== undefined 
                      ? `$${currentPrice.toLocaleString()}` 
                      : 'Loading...'}
                  </Td>
                  <Td color={priceChange >= 0 ? 'green.500' : 'red.500'}>
                    {priceChange !== undefined 
                      ? `${priceChange.toFixed(2)}%`
                      : '-'}
                  </Td>
                  <Td>{formatMarketCap(marketCap)}</Td>
                  <Td>
                    <IconButton
                      aria-label="Remove from watchlist"
                      icon={<DeleteIcon />}
                      colorScheme="red"
                      size="sm"
                      onClick={() => removeFromWatchlist(coin.id)}
                    />
                  </Td>
                </Tr>
              )
            })}
          </Tbody>
        </Table>
      </VStack>
    </Box>
  )
}

export default WatchList 