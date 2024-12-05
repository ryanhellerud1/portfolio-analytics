import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  useColorModeValue,
  Spinner,
  Alert,
  AlertIcon,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel
} from '@chakra-ui/react'
import { useEffect, useState, useMemo } from 'react'
import { analyticsApi } from '../../services/analyticsApi'

export default function PriceMomentum() {
  const [momentum, setMomentum] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const bgColor = useColorModeValue('white', 'gray.700')

  useEffect(() => {
    fetchMomentumData()
  }, [])

  const fetchMomentumData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await analyticsApi.getPriceMomentum()
      if (!data.data) throw new Error('No data received')
      setMomentum(data.data)
    } catch (error) {
      console.error('Error fetching momentum data:', error)
      setError(error.message || 'Failed to fetch momentum data')
    } finally {
      setIsLoading(false)
    }
  }

  const processedMomentumData = useMemo(() => {
    if (!momentum.length) return {
      all: [],
      strongUptrend: [],
      strongDowntrend: [],
      volatile: []
    }

    // First, deduplicate by SYMBOL if there are any duplicates
    const uniqueData = momentum.reduce((acc, curr) => {
      if (!acc[curr.SYMBOL]) {
        acc[curr.SYMBOL] = curr
      }
      return acc
    }, {})

    const sortedData = Object.values(uniqueData).sort((a, b) => Math.abs(b.MOMENTUM_1D) - Math.abs(a.MOMENTUM_1D))
    
    // Create categories without duplicating data
    const categories = {
      strongUptrend: sortedData.filter(item => item.TREND_DIRECTION === 'STRONG_UPTREND'),
      strongDowntrend: sortedData.filter(item => item.TREND_DIRECTION === 'STRONG_DOWNTREND'),
      volatile: sortedData.filter(item => Math.abs(item.MOMENTUM_1D) > 10)
    }

    return {
      ...categories,
      all: sortedData
    }
  }, [momentum])

  const getTrendColor = (trend) => {
    switch (trend) {
      case 'STRONG_UPTREND': return 'green'
      case 'UPTREND': return 'teal'
      case 'STRONG_DOWNTREND': return 'red'
      case 'DOWNTREND': return 'orange'
      default: return 'gray'
    }
  }

  const formatMomentum = (value) => {
    if (value === null || value === undefined) return '0.00'
    return Number(value).toFixed(2)
  }

  const renderMomentumCard = (item) => (
    <Box key={item.SYMBOL} p={4} borderWidth="1px" borderRadius="md">
      <HStack justify="space-between" mb={2}>
        <Text fontWeight="bold">{item.SYMBOL || 'Unknown'}</Text>
        <Badge colorScheme={getTrendColor(item.TREND_DIRECTION)}>
          {(item.TREND_DIRECTION || 'UNKNOWN').replace('_', ' ')}
        </Badge>
      </HStack>
      <HStack spacing={6}>
        <Stat>
          <StatLabel>24h</StatLabel>
          <StatNumber>
            <StatArrow type={Number(item.MOMENTUM_1D || 0) >= 0 ? 'increase' : 'decrease'} />
            {formatMomentum(item.MOMENTUM_1D)}%
          </StatNumber>
        </Stat>
        <Stat>
          <StatLabel>7d</StatLabel>
          <StatNumber>
            <StatArrow type={Number(item.MOMENTUM_7D || 0) >= 0 ? 'increase' : 'decrease'} />
            {formatMomentum(item.MOMENTUM_7D)}%
          </StatNumber>
        </Stat>
        <Stat>
          <StatLabel>30d</StatLabel>
          <StatNumber>
            <StatArrow type={Number(item.MOMENTUM_30D || 0) >= 0 ? 'increase' : 'decrease'} />
            {formatMomentum(item.MOMENTUM_30D)}%
          </StatNumber>
        </Stat>
      </HStack>
    </Box>
  )

  if (isLoading) {
    return (
      <HStack spacing={4} justify="center" py={4}>
        <Spinner />
        <Text>Loading momentum data...</Text>
      </HStack>
    )
  }

  if (error) {
    return (
      <Alert status="error">
        <AlertIcon />
        <Text>{error}</Text>
      </Alert>
    )
  }

  return (
    <Tabs variant="soft-rounded" colorScheme="purple">
      <TabList>
        <Tab>All Assets ({processedMomentumData.all.length})</Tab>
        <Tab>Strong Uptrend ({processedMomentumData.strongUptrend.length})</Tab>
        <Tab>Strong Downtrend ({processedMomentumData.strongDowntrend.length})</Tab>
        <Tab>High Volatility ({processedMomentumData.volatile.length})</Tab>
      </TabList>
      <TabPanels>
        <TabPanel>
          <VStack spacing={4} align="stretch">
            {processedMomentumData.all.map(renderMomentumCard)}
            {!processedMomentumData.all.length && (
              <Text color="gray.500" textAlign="center">No momentum data available</Text>
            )}
          </VStack>
        </TabPanel>
        <TabPanel>
          <VStack spacing={4} align="stretch">
            {processedMomentumData.strongUptrend.map(renderMomentumCard)}
            {!processedMomentumData.strongUptrend.length && (
              <Text color="gray.500" textAlign="center">No assets in strong uptrend</Text>
            )}
          </VStack>
        </TabPanel>
        <TabPanel>
          <VStack spacing={4} align="stretch">
            {processedMomentumData.strongDowntrend.map(renderMomentumCard)}
            {!processedMomentumData.strongDowntrend.length && (
              <Text color="gray.500" textAlign="center">No assets in strong downtrend</Text>
            )}
          </VStack>
        </TabPanel>
        <TabPanel>
          <VStack spacing={4} align="stretch">
            {processedMomentumData.volatile.map(renderMomentumCard)}
            {!processedMomentumData.volatile.length && (
              <Text color="gray.500" textAlign="center">No highly volatile assets</Text>
            )}
          </VStack>
        </TabPanel>
      </TabPanels>
    </Tabs>
  )
} 