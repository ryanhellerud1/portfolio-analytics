import {
  Box,
  VStack,
  HStack,
  Text,
  Progress,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  useColorModeValue,
  Badge,
  Grid,
  Spinner,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Alert,
  AlertIcon
} from '@chakra-ui/react'
import { useEffect, useState, useMemo } from 'react'

export default function VolatilityAnalysis() {
  const [volatilityData, setVolatilityData] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const bgColor = useColorModeValue('white', 'gray.700')

  useEffect(() => {
    fetchVolatilityData()
  }, [])

  const fetchVolatilityData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch('/api/analytics/risk')
      const data = await response.json()
      if (!data.data) throw new Error('No data received')
      setVolatilityData(data.data)
    } catch (error) {
      console.error('Error fetching volatility data:', error)
      setError(error.message || 'Failed to fetch volatility data')
    } finally {
      setIsLoading(false)
    }
  }

  const riskCategories = useMemo(() => {
    if (!volatilityData?.length) return {
      all: [],
      highRisk: [],
      mediumRisk: [],
      lowRisk: []
    }

    const categories = volatilityData.reduce((acc, item) => {
      if (item.RISK_CATEGORY === 'HIGH_RISK') acc.highRisk.push(item)
      else if (item.RISK_CATEGORY === 'MEDIUM_RISK') acc.mediumRisk.push(item)
      else acc.lowRisk.push(item)
      return acc
    }, { highRisk: [], mediumRisk: [], lowRisk: [] })

    return {
      ...categories,
      all: volatilityData
    }
  }, [volatilityData])

  const renderRiskCard = (item) => {
    const riskCategory = item.RISK_CATEGORY || 'UNKNOWN_RISK'
    const symbol = item.SYMBOL || 'Unknown'
    const dailyVolatility = parseFloat(item.DAILY_VOLATILITY || 0)
    const volumeToMcap = parseFloat(item.VOLUME_TO_MCAP_RATIO || 0)
    const max7dReturn = parseFloat(item.MAX_7D_RETURN || 0)
    const min7dReturn = parseFloat(item.MIN_7D_RETURN || 0)
    const maxDrawdown = parseFloat(item.MAX_DRAWDOWN || 0)

    return (
      <Box key={symbol} p={4} borderWidth="1px" borderRadius="md">
        <HStack justify="space-between" mb={2}>
          <Text fontWeight="bold">{symbol}</Text>
          <Badge colorScheme={
            riskCategory === 'HIGH_RISK' ? 'red' : 
            riskCategory === 'MEDIUM_RISK' ? 'yellow' : 
            'green'
          }>
            {riskCategory.replace(/_/g, ' ')}
          </Badge>
        </HStack>
        <Grid templateColumns="repeat(2, 1fr)" gap={4}>
          <Stat>
            <StatLabel>Daily Volatility</StatLabel>
            <StatNumber>{dailyVolatility.toFixed(2)}%</StatNumber>
          </Stat>
          <Stat>
            <StatLabel>Volume/MCap Ratio</StatLabel>
            <StatNumber>{(volumeToMcap * 100).toFixed(2)}%</StatNumber>
          </Stat>
        </Grid>
        <Grid templateColumns="repeat(3, 1fr)" gap={4} mt={4}>
          <Stat>
            <StatLabel>Max 7D Return</StatLabel>
            <StatNumber>
              <StatArrow type="increase" />
              {max7dReturn.toFixed(2)}%
            </StatNumber>
          </Stat>
          <Stat>
            <StatLabel>Min 7D Return</StatLabel>
            <StatNumber>
              <StatArrow type="decrease" />
              {min7dReturn.toFixed(2)}%
            </StatNumber>
          </Stat>
          <Stat>
            <StatLabel>Max Drawdown</StatLabel>
            <StatNumber>{maxDrawdown.toFixed(2)}%</StatNumber>
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
          <Tab>All ({riskCategories.all.length})</Tab>
          <Tab>High Risk ({riskCategories.highRisk.length})</Tab>
          <Tab>Medium Risk ({riskCategories.mediumRisk.length})</Tab>
          <Tab>Low Risk ({riskCategories.lowRisk.length})</Tab>
        </TabList>

        <TabPanels>
          <TabPanel>
            <VStack spacing={4} align="stretch">
              {riskCategories.all.map(item => renderRiskCard(item))}
            </VStack>
          </TabPanel>
          <TabPanel>
            <VStack spacing={4} align="stretch">
              {riskCategories.highRisk.map(item => renderRiskCard(item))}
            </VStack>
          </TabPanel>
          <TabPanel>
            <VStack spacing={4} align="stretch">
              {riskCategories.mediumRisk.map(item => renderRiskCard(item))}
            </VStack>
          </TabPanel>
          <TabPanel>
            <VStack spacing={4} align="stretch">
              {riskCategories.lowRisk.map(item => renderRiskCard(item))}
            </VStack>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  )
} 