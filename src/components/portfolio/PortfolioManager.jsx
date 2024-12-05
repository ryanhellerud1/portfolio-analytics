import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  VStack,
  HStack,
  NumberInput,
  NumberInputField,
  useToast,
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
  useOutsideClick,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Select
} from '@chakra-ui/react'
import { DeleteIcon, EditIcon } from '@chakra-ui/icons'
import { useState, useEffect, useRef } from 'react'
import { useCrypto } from '../../context/CryptoContext'
import { cryptoApi } from '../../services/cryptoApi'
import { CATEGORIES } from '../../utils/coinClassifications'
import { useSync } from '../../context/SyncContext'

// Move EditModal outside the main component
const EditModal = ({ 
  isOpen, 
  onClose, 
  holding, 
  onSave,
  onAmountChange,
  onCategoryChange 
}) => (
  <Modal isOpen={isOpen} onClose={onClose}>
    <ModalOverlay />
    <ModalContent>
      <ModalHeader>Edit Holding</ModalHeader>
      <ModalCloseButton />
      <ModalBody>
        {holding && (
          <VStack spacing={4}>
            <FormControl>
              <FormLabel>Name</FormLabel>
              <Input value={holding.name} isReadOnly />
            </FormControl>
            <FormControl>
              <FormLabel>Symbol</FormLabel>
              <Input value={holding.symbol} isReadOnly />
            </FormControl>
            <FormControl isRequired>
              <FormLabel>Amount</FormLabel>
              <Input
                type="number"
                min="0"
                step="any"
                value={holding.amount}
                onChange={(e) => onAmountChange(e.target.value)}
                placeholder="0.00"
              />
            </FormControl>
            <FormControl isRequired>
              <FormLabel>Category</FormLabel>
              <Select
                value={holding.category}
                onChange={(e) => onCategoryChange(e.target.value)}
              >
                {Object.entries(CATEGORIES).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value.name}
                  </option>
                ))}
              </Select>
            </FormControl>
          </VStack>
        )}
      </ModalBody>
      <ModalFooter>
        <Button variant="ghost" mr={3} onClick={onClose}>
          Cancel
        </Button>
        <Button 
          colorScheme="blue" 
          onClick={onSave}
          isDisabled={!holding || !holding.amount}
        >
          Save Changes
        </Button>
      </ModalFooter>
    </ModalContent>
  </Modal>
)

function PortfolioManager() {
  const [newHolding, setNewHolding] = useState({ 
    symbol: '', 
    amount: '', 
    selectedCrypto: null,
    category: Object.keys(CATEGORIES)[0]
  })
  const [isLoading, setIsLoading] = useState(false)
  const [searchResults, setSearchResults] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const searchRef = useRef(null)
  const toast = useToast()
  const { holdings, prices, isLoading: pricesLoading, addHolding, removeHolding, updateHolding } = useCrypto()
  const [editingHolding, setEditingHolding] = useState(null)
  const { isOpen, onOpen, onClose } = useDisclosure()
  const { isSyncing, triggerSync } = useSync()

  useOutsideClick({
    ref: searchRef,
    handler: () => setShowDropdown(false),
  })

  // Debounce search function
  useEffect(() => {
    const searchTimeout = setTimeout(async () => {
      if (newHolding.symbol.length >= 2) {
        try {
          const results = await cryptoApi.searchCryptos(newHolding.symbol)
          setSearchResults(results.slice(0, 5)) // Limit to top 5 results
          setShowDropdown(true)
        } catch (error) {
          console.error('Search error:', error)
        }
      } else {
        setSearchResults([])
        setShowDropdown(false)
      }
    }, 500) // Increased from 300ms to 500ms

    return () => clearTimeout(searchTimeout)
  }, [newHolding.symbol])

  const selectCrypto = (crypto) => {
    console.log('Selected crypto:', crypto)
    setNewHolding(prev => ({ 
      ...prev, 
      symbol: crypto.symbol,
      selectedCrypto: {
        id: crypto.id,
        symbol: crypto.symbol,
        name: crypto.name,
        current_price: crypto.current_price,
        price_change_24h: crypto.price_change_24h
      }
    }))
    setShowDropdown(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!newHolding.symbol || !newHolding.amount || !newHolding.selectedCrypto) {
      toast({
        title: 'Error',
        description: 'Please select a cryptocurrency and enter an amount',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
      return
    }

    setIsLoading(true)
    try {
      const cryptoInfo = newHolding.selectedCrypto
      console.log('Adding holding with crypto info:', cryptoInfo)
      
      const newHoldingData = { 
        id: Date.now(),
        coinId: cryptoInfo.id,
        symbol: cryptoInfo.symbol.toUpperCase(),
        name: cryptoInfo.name,
        amount: parseFloat(newHolding.amount),
        category: newHolding.category || Object.keys(CATEGORIES)[0]
      }
      
      console.log('New holding data:', newHoldingData)
      addHolding(newHoldingData)
      setNewHolding({ 
        symbol: '', 
        amount: '', 
        selectedCrypto: null,
        category: Object.keys(CATEGORIES)[0]
      })
      
      toast({
        title: 'Holding Added',
        description: `Added ${newHolding.amount} ${cryptoInfo.name}`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      })
    } catch (error) {
      console.error('Error adding holding:', error)
      toast({
        title: 'Error',
        description: 'Failed to add holding. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = (holding) => {
    setEditingHolding({
      ...holding,
      amount: holding.amount.toString()
    })
    onOpen()
  }

  const handleAmountChange = (value) => {
    setEditingHolding(prev => ({
      ...prev,
      amount: value
    }))
  }

  const handleCategoryChange = (category) => {
    setEditingHolding(prev => ({
      ...prev,
      category
    }))
  }

  const handleSaveEdit = () => {
    if (!editingHolding) return

    const updatedHolding = {
      ...editingHolding,
      amount: parseFloat(editingHolding.amount),
      category: editingHolding.category || 'Other'
    }

    updateHolding(updatedHolding)

    toast({
      title: 'Holding Updated',
      description: `Updated ${updatedHolding.name}`,
      status: 'success',
      duration: 3000,
      isClosable: true,
    })

    onClose()
    setEditingHolding(null)
  }

  const handleCloseModal = () => {
    onClose()
    setEditingHolding(null)
  }

  const syncToSnowflake = async () => {
    try {
      await triggerSync(async () => {
        console.log('Starting Snowflake sync...')
        
        // Debug price data
        console.log('Current prices:', {
          raw: prices,
          sample: Object.entries(prices).map(([id, data]) => ({
            id,
            price: data.usd,
            change_24h: data.usd_24h_change
          }))
        })
        
        const payload = {
          holdings: holdings.map(h => ({
            coin_id: h.coinId,
            symbol: h.symbol,
            name: h.name,
            amount: h.amount,
            category: h.category || 'Other'
          })),
          prices: holdings.map(h => ({
            coin_id: h.coinId,
            price_usd: prices[h.coinId]?.usd || 0,
            market_cap_usd: prices[h.coinId]?.usd_market_cap || 0,
            volume_24h_usd: prices[h.coinId]?.usd_24h_vol || 0,
            price_change_24h_pct: prices[h.coinId]?.usd_24h_change ?? 0
          }))
        }

        console.log('Sync payload:', {
          holdings: payload.holdings,
          prices: Object.entries(payload.prices).map(([id, data]) => ({
            id,
            price: data.usd,
            change_24h: data.usd_24h_change
          }))
        })
        
        const response = await fetch('/api/sync-snowflake', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(payload)
        })
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `Server responded with ${response.status}`)
        }

        const data = await response.json()
        console.log('Sync response:', data)
        
        toast({
          title: 'Sync Successful',
          description: 'Portfolio data synced to Snowflake',
          status: 'success',
          duration: 3000,
          isClosable: true,
        })
      })
    } catch (error) {
      console.error('Sync error:', error)
      toast({
        title: 'Sync Failed',
        description: error.message || 'Failed to sync with Snowflake',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    }
  }

  return (
    <Box p={4}>
      <VStack spacing={6} align="stretch">
        <Box as="form" onSubmit={handleSubmit}>
          <HStack spacing={4} align="flex-end">
            <FormControl isRequired position="relative" ref={searchRef}>
              <FormLabel>Crypto Symbol</FormLabel>
              <Input
                value={newHolding.symbol}
                onChange={(e) => setNewHolding({ ...newHolding, symbol: e.target.value })}
                placeholder="Search crypto (e.g., BTC)"
                isDisabled={isLoading}
              />
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
                      onClick={() => selectCrypto(crypto)}
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
            </FormControl>
            <FormControl isRequired>
              <FormLabel>Amount</FormLabel>
              <NumberInput min={0}>
                <NumberInputField
                  value={newHolding.amount}
                  onChange={(e) => setNewHolding({ ...newHolding, amount: e.target.value })}
                  placeholder="0.00"
                  isDisabled={isLoading}
                />
              </NumberInput>
            </FormControl>
            <FormControl isRequired>
              <FormLabel>Category</FormLabel>
              <Select
                value={newHolding.category}
                onChange={(e) => setNewHolding(prev => ({ 
                  ...prev, 
                  category: e.target.value 
                }))}
              >
                {Object.entries(CATEGORIES).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value.name}
                  </option>
                ))}
              </Select>
            </FormControl>
            <Button 
              type="submit" 
              colorScheme="blue"
              isLoading={isLoading}
            >
              Add Holding
            </Button>
          </HStack>
        </Box>

        <Table variant="simple">
          <Thead>
            <Tr>
              <Th>Name</Th>
              <Th>Symbol</Th>
              <Th>Category</Th>
              <Th>Amount</Th>
              <Th>Price</Th>
              <Th>Total Value</Th>
              <Th>Action</Th>
            </Tr>
          </Thead>
          <Tbody>
            {holdings.map((holding) => {
              const currentPrice = prices[holding.coinId]?.usd
              const totalValue = currentPrice ? currentPrice * holding.amount : null
              return (
                <Tr key={holding.id}>
                  <Td>{holding.name}</Td>
                  <Td>{holding.symbol}</Td>
                  <Td>{holding.category}</Td>
                  <Td>{holding.amount.toLocaleString()}</Td>
                  <Td>
                    {currentPrice !== undefined 
                      ? `$${currentPrice.toLocaleString()}` 
                      : 'Loading...'}
                  </Td>
                  <Td>
                    {totalValue !== null 
                      ? `$${totalValue.toLocaleString()}` 
                      : 'Loading...'}
                  </Td>
                  <Td>
                    <HStack spacing={2}>
                      <IconButton
                        aria-label="Edit holding"
                        icon={<EditIcon />}
                        colorScheme="blue"
                        onClick={() => handleEdit(holding)}
                      />
                      <IconButton
                        aria-label="Delete holding"
                        icon={<DeleteIcon />}
                        colorScheme="red"
                        onClick={() => removeHolding(holding.id)}
                      />
                    </HStack>
                  </Td>
                </Tr>
              )
            })}
          </Tbody>
        </Table>
        
        <Box borderWidth="1px" borderRadius="lg" p={4} bg="gray.50">
          <Text fontSize="xl" fontWeight="bold">
            Total Portfolio Value: $
            {holdings.reduce((total, holding) => {
              const price = prices[holding.coinId]?.usd
              return price !== undefined ? total + (price * holding.amount) : total
            }, 0).toLocaleString()}
          </Text>
        </Box>
        <Button
          onClick={syncToSnowflake}
          colorScheme="purple"
          size="sm"
          ml={4}
          isLoading={isSyncing}
          loadingText="Syncing..."
        >
          Sync to Snowflake
        </Button>
      </VStack>
      <EditModal 
        isOpen={isOpen}
        onClose={handleCloseModal}
        holding={editingHolding}
        onSave={handleSaveEdit}
        onAmountChange={handleAmountChange}
        onCategoryChange={handleCategoryChange}
      />
    </Box>
  )
}

export default PortfolioManager 