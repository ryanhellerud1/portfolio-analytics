import { Box, Text, VStack, Stat, StatLabel, StatNumber, StatHelpText, StatArrow, Table, Thead, Tbody, Tr, Th, Td } from '@chakra-ui/react'
import { useState, useEffect } from 'react'
import { useCrypto } from '../../context/CryptoContext'

function PortfolioSummary() {
  const context = useCrypto()
  
  // Return early if context is not available
  if (!context) return null

  const { holdings, prices, isLoading } = context
  const [totalValue, setTotalValue] = useState(0)
  const [totalChange, setTotalChange] = useState(0)

  const formatMarketCap = (marketCap) => {
    if (marketCap === undefined) return '-'
    if (marketCap >= 1e12) return `$${(marketCap / 1e12).toFixed(2)}T`
    if (marketCap >= 1e9) return `$${(marketCap / 1e9).toFixed(2)}B`
    if (marketCap >= 1e6) return `$${(marketCap / 1e6).toFixed(2)}M`
    return `$${marketCap.toLocaleString()}`
  }

  useEffect(() => {
    let newTotalValue = 0
    let weightedChange = 0

    holdings.forEach(holding => {
      const price = prices[holding.coinId]?.usd || 0
      const change = prices[holding.coinId]?.usd_24h_change || 0
      const value = price * holding.amount
      
      newTotalValue += value
      weightedChange += (change * value) // Weight the change by the holding's value
    })

    setTotalValue(newTotalValue)
    // Calculate weighted average change
    setTotalChange(newTotalValue > 0 ? weightedChange / newTotalValue : 0)
  }, [holdings, prices])

  return (
    <Box borderWidth="1px" borderRadius="lg" p={4}>
      <Text fontSize="xl" mb={4}>Portfolio Summary</Text>
      <VStack align="stretch" spacing={4}>
        <Stat>
          <StatLabel>Total Value</StatLabel>
          <StatNumber>${totalValue.toLocaleString()}</StatNumber>
          <StatHelpText>
            <StatArrow type={totalChange >= 0 ? 'increase' : 'decrease'} />
            {totalChange.toFixed(2)}%
          </StatHelpText>
        </Stat>

        <Table variant="simple" size="sm">
          <Thead>
            <Tr>
              <Th>Asset</Th>
              <Th>Amount</Th>
              <Th>Value</Th>
              <Th>24h Change</Th>
              <Th>Market Cap</Th>
            </Tr>
          </Thead>
          <Tbody>
            {holdings.map((holding) => {
              const currentPrice = prices[holding.coinId]?.usd
              const priceChange = prices[holding.coinId]?.usd_24h_change
              const marketCap = prices[holding.coinId]?.usd_market_cap
              const value = currentPrice ? currentPrice * holding.amount : null
              return (
                <Tr key={holding.id}>
                  <Td>{holding.name}</Td>
                  <Td>{holding.amount.toLocaleString()}</Td>
                  <Td>
                    {value !== null 
                      ? `$${value.toLocaleString()}` 
                      : 'Loading...'}
                  </Td>
                  <Td color={priceChange >= 0 ? 'green.500' : 'red.500'}>
                    {priceChange !== undefined 
                      ? `${priceChange.toFixed(2)}%`
                      : '-'}
                  </Td>
                  <Td>{formatMarketCap(marketCap)}</Td>
                </Tr>
              )
            })}
          </Tbody>
        </Table>
      </VStack>
    </Box>
  )
}

export default PortfolioSummary