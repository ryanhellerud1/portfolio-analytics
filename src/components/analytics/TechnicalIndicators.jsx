import {
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Spinner,
  Alert,
  AlertIcon,
  useColorModeValue,
  Text,
  HStack,
  Icon,
  Tabs,
  TabList,
  TabPanels,
  TabPanel,
  Tab,
  VStack,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Progress,
  Grid
} from '@chakra-ui/react'
import { useEffect, useState, useMemo } from 'react'
import { analyticsApi } from '../../services/analyticsApi'
import { FiTrendingUp, FiTrendingDown } from 'react-icons/fi'

export default function TechnicalIndicators() {
  const [technicalData, setTechnicalData] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const bgColor = useColorModeValue('white', 'gray.700')

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch('/api/analytics/technical')
      const data = await response.json()
      if (!data.data) throw new Error('No technical data received')
      setTechnicalData(data.data)
    } catch (error) {
      console.error('Error fetching technical indicators:', error)
      setError(error.message || 'Failed to fetch technical indicators')
    } finally {
      setIsLoading(false)
    }
  }

  const processedTechnicalData = useMemo(() => {
    if (!technicalData?.length) return { 
      all: [], 
      buy: [], 
      sell: [], 
      hold: [] 
    }

    const sortedData = [...technicalData].sort((a, b) => 
      Math.abs(parseFloat(b.price_change) || 0) - Math.abs(parseFloat(a.price_change) || 0)
    )

    return {
      all: sortedData,
      buy: sortedData.filter(i => i.signal === 'buy'),
      sell: sortedData.filter(i => i.signal === 'sell'),
      hold: sortedData.filter(i => i.signal === 'hold' || !i.signal)
    }
  }, [technicalData])

  const getSignalColor = (signal) => {
    switch (signal) {
      case 'buy': return 'green'
      case 'sell': return 'red'
      default: return 'yellow'
    }
  }

  const renderIndicatorCard = (item) => {
    // Safely parse numeric values with fallbacks
    const priceChange = parseFloat(item.price_change) || 0
    const rsi = parseFloat(item.rsi) || 0
    const sma20 = parseFloat(item.sma_20) || 0
    const ema50 = parseFloat(item.ema_50) || 0

    return (
      <Box key={item.coin} p={4} borderWidth="1px" borderRadius="md">
        <HStack justify="space-between" mb={2}>
          <Text fontWeight="bold">{item.coin || 'Unknown'}</Text>
          <Badge colorScheme={getSignalColor(item.signal || 'hold')}>
            {(item.signal || 'HOLD').toUpperCase()}
          </Badge>
        </HStack>
        <Grid templateColumns="repeat(2, 1fr)" gap={4}>
          <Stat>
            <StatLabel>Price Change</StatLabel>
            <StatNumber>
              <StatArrow type={priceChange >= 0 ? 'increase' : 'decrease'} />
              {Math.abs(priceChange).toFixed(2)}%
            </StatNumber>
          </Stat>
          <Stat>
            <StatLabel>RSI</StatLabel>
            <StatNumber>{rsi.toFixed(2)}</StatNumber>
            <StatHelpText>
              {rsi > 70 ? 'Overbought' : rsi < 30 ? 'Oversold' : 'Neutral'}
            </StatHelpText>
          </Stat>
        </Grid>
        <Grid templateColumns="repeat(2, 1fr)" gap={4} mt={4}>
          <Stat>
            <StatLabel>SMA (20)</StatLabel>
            <StatNumber>${sma20.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}</StatNumber>
          </Stat>
          <Stat>
            <StatLabel>EMA (50)</StatLabel>
            <StatNumber>${ema50.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}</StatNumber>
          </Stat>
        </Grid>
      </Box>
    )
  }

  if (isLoading) return (
    <Box p={4} textAlign="center">
      <Spinner size="xl" />
    </Box>
  )

  if (error) return (
    <Alert status="error">
      <AlertIcon />
      {error}
    </Alert>
  )

  return (
    <Box bg={bgColor} p={4} borderRadius="lg" shadow="sm">
      <Tabs variant="enclosed">
        <TabList>
          <Tab>All ({processedTechnicalData.all.length})</Tab>
          <Tab>Buy ({processedTechnicalData.buy.length})</Tab>
          <Tab>Sell ({processedTechnicalData.sell.length})</Tab>
          <Tab>Hold ({processedTechnicalData.hold.length})</Tab>
        </TabList>

        <TabPanels>
          <TabPanel>
            <VStack spacing={4} align="stretch">
              {processedTechnicalData.all.map(item => renderIndicatorCard(item))}
            </VStack>
          </TabPanel>
          <TabPanel>
            <VStack spacing={4} align="stretch">
              {processedTechnicalData.buy.map(item => renderIndicatorCard(item))}
            </VStack>
          </TabPanel>
          <TabPanel>
            <VStack spacing={4} align="stretch">
              {processedTechnicalData.sell.map(item => renderIndicatorCard(item))}
            </VStack>
          </TabPanel>
          <TabPanel>
            <VStack spacing={4} align="stretch">
              {processedTechnicalData.hold.map(item => renderIndicatorCard(item))}
            </VStack>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  )
} 