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
  Progress
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
      const technicalRes = await analyticsApi.getTechnicalIndicators()
      if (!technicalRes.data) throw new Error('No technical data received')
      setTechnicalData(technicalRes.data)
    } catch (error) {
      console.error('Error fetching technical indicators:', error)
      setError(error.message || 'Failed to fetch technical indicators')
    } finally {
      setIsLoading(false)
    }
  }

  // Process and deduplicate technical data
  const processedTechnicalData = useMemo(() => {
    if (!technicalData.length) return { all: [], overbought: [], oversold: [], trending: [] }

    const latestData = technicalData.reduce((acc, curr) => {
      if (!acc[curr.SYMBOL] || new Date(curr.TIMESTAMP) > new Date(acc[curr.SYMBOL].TIMESTAMP)) {
        acc[curr.SYMBOL] = curr
      }
      return acc
    }, {})

    const uniqueIndicators = Object.values(latestData)

    return {
      all: uniqueIndicators,
      overbought: uniqueIndicators.filter(i => Number(i.RSI) > 70),
      oversold: uniqueIndicators.filter(i => Number(i.RSI) < 30),
      trending: uniqueIndicators.filter(i => i.TREND_SIGNAL === 'BULLISH' || i.TREND_SIGNAL === 'BEARISH')
    }
  }, [technicalData])

  const getTrendColor = (trend) => {
    switch (trend) {
      case 'BULLISH': return 'green'
      case 'BEARISH': return 'red'
      default: return 'gray'
    }
  }

  const getRSIColor = (rsi) => {
    if (!rsi) return 'gray'
    if (rsi > 70) return 'red'
    if (rsi < 30) return 'green'
    return 'yellow'
  }

  const getRSISignal = (rsi) => {
    if (!rsi) return { text: 'Neutral', color: 'gray' }
    if (rsi > 70) return { text: 'Overbought', color: 'red' }
    if (rsi < 30) return { text: 'Oversold', color: 'green' }
    return { text: 'Neutral', color: 'yellow' }
  }

  const formatPrice = (price) => {
    if (!price) return '0.00'
    return Number(price).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  }

  const formatRSI = (rsi) => {
    if (!rsi) return '0.00'
    return Number(rsi).toFixed(2)
  }

  const formatPercentage = (value) => {
    if (!value) return '0.00'
    return Number(value).toFixed(2)
  }

  const renderTechnicalTable = (data) => (
    <Table variant="simple" size="sm">
      <Thead>
        <Tr>
          <Th>Asset</Th>
          <Th>Price</Th>
          <Th>Trend</Th>
          <Th>RSI (14)</Th>
          <Th>Signal</Th>
        </Tr>
      </Thead>
      <Tbody>
        {data.length > 0 ? data.map((indicator, idx) => (
          <Tr key={indicator.SYMBOL + idx}>
            <Td fontWeight="medium">{indicator.SYMBOL || 'Unknown'}</Td>
            <Td>${formatPrice(indicator.PRICE_USD)}</Td>
            <Td>
              <Badge 
                colorScheme={getTrendColor(indicator.TREND_SIGNAL)}
                display="flex"
                alignItems="center"
                width="fit-content"
              >
                <Icon 
                  as={indicator.TREND_SIGNAL === 'BULLISH' ? FiTrendingUp : FiTrendingDown} 
                  mr={1}
                />
                {indicator.TREND_SIGNAL || 'NEUTRAL'}
              </Badge>
            </Td>
            <Td>
              <Badge colorScheme={getRSIColor(indicator.RSI)}>
                {formatRSI(indicator.RSI)}
              </Badge>
            </Td>
            <Td>
              <Text color={getRSIColor(indicator.RSI) + '.500'}>
                {getRSISignal(indicator.RSI).text}
              </Text>
            </Td>
          </Tr>
        )) : (
          <Tr>
            <Td colSpan={5}>
              <Text color="gray.500" textAlign="center">No data available</Text>
            </Td>
          </Tr>
        )}
      </Tbody>
    </Table>
  )

  if (isLoading) {
    return (
      <HStack spacing={4} justify="center" py={4}>
        <Spinner />
        <Text>Loading technical indicators...</Text>
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
    <Tabs variant="soft-rounded" colorScheme="green">
      <TabList>
        <Tab>All Assets ({processedTechnicalData.all.length})</Tab>
        <Tab>Overbought ({processedTechnicalData.overbought.length})</Tab>
        <Tab>Oversold ({processedTechnicalData.oversold.length})</Tab>
        <Tab>Trending ({processedTechnicalData.trending.length})</Tab>
      </TabList>
      <TabPanels>
        <TabPanel>{renderTechnicalTable(processedTechnicalData.all)}</TabPanel>
        <TabPanel>{renderTechnicalTable(processedTechnicalData.overbought)}</TabPanel>
        <TabPanel>{renderTechnicalTable(processedTechnicalData.oversold)}</TabPanel>
        <TabPanel>{renderTechnicalTable(processedTechnicalData.trending)}</TabPanel>
      </TabPanels>
    </Tabs>
  )
} 