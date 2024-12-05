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
  TabPanel
} from '@chakra-ui/react'
import { useEffect, useState, useMemo } from 'react'

export default function VolatilityAnalysis() {
  const [volatilityData, setVolatilityData] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const bgColor = useColorModeValue('white', 'gray.700')

  useEffect(() => {
    fetchVolatilityData()
  }, [])

  const fetchVolatilityData = async () => {
    try {
      const response = await fetch('/api/analytics/risk')
      const data = await response.json()
      setVolatilityData(data.data)
    } catch (error) {
      console.error('Error fetching volatility data:', error)
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
    const dailyVolatility = item.DAILY_VOLATILITY || 0
    const sharpeRatio = item.SHARPE_RATIO || 0
    const var95 = item.VAR_95 || 0
    const max7dReturn = item.MAX_7D_RETURN || 0
    const min7dReturn = item.MIN_7D_RETURN || 0
    const maxDrawdown = item.MAX_DRAWDOWN || 0

    return (
      <Box key={symbol} p={4} borderWidth="1px" borderRadius="md">
        <HStack justify="space-between" mb={2}>
          <Text fontWeight="bold">{symbol}</Text>
          <Badge colorScheme={
            riskCategory === 'HIGH_RISK' ? 'red' : 
            riskCategory === 'MEDIUM_RISK' ? 'yellow' : 
            riskCategory === 'LOW_RISK' ? 'green' : 'gray'
          }>
            {riskCategory.replace(/_/g, ' ')}
          </Badge>
        </HStack>
        <Grid templateColumns="repeat(3, 1fr)" gap={4}>
          <Stat>
            <StatLabel>Daily Volatility</StatLabel>
            <StatNumber>{dailyVolatility.toFixed(2)}%</StatNumber>
          </Stat>
          <Stat>
            <StatLabel>Sharpe Ratio</StatLabel>
            <StatNumber>{sharpeRatio.toFixed(2)}</StatNumber>
          </Stat>
          <Stat>
            <StatLabel>Value at Risk (95%)</StatLabel>
            <StatNumber>{var95.toFixed(2)}%</StatNumber>
          </Stat>
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
            <StatNumber>
              <StatArrow type="decrease" />
              {Math.abs(maxDrawdown).toFixed(2)}%
            </StatNumber>
          </Stat>
        </Grid>
      </Box>
    )
  }

  if (isLoading) {
    return (
      <HStack spacing={4} justify="center" py={4}>
        <Spinner />
        <Text>Loading risk analysis...</Text>
      </HStack>
    )
  }

  return (
    <Tabs variant="soft-rounded" colorScheme="red">
      <TabList>
        <Tab>All Assets ({riskCategories.all.length})</Tab>
        <Tab>High Risk ({riskCategories.highRisk.length})</Tab>
        <Tab>Medium Risk ({riskCategories.mediumRisk.length})</Tab>
        <Tab>Low Risk ({riskCategories.lowRisk.length})</Tab>
      </TabList>
      <TabPanels>
        <TabPanel>
          <VStack spacing={4} align="stretch">
            {riskCategories.all.map(renderRiskCard)}
            {!riskCategories.all.length && (
              <Text color="gray.500" textAlign="center">No risk analysis data available</Text>
            )}
          </VStack>
        </TabPanel>
        <TabPanel>
          <VStack spacing={4} align="stretch">
            {riskCategories.highRisk.map(renderRiskCard)}
            {!riskCategories.highRisk.length && (
              <Text color="gray.500" textAlign="center">No high risk assets found</Text>
            )}
          </VStack>
        </TabPanel>
        <TabPanel>
          <VStack spacing={4} align="stretch">
            {riskCategories.mediumRisk.map(renderRiskCard)}
            {!riskCategories.mediumRisk.length && (
              <Text color="gray.500" textAlign="center">No medium risk assets found</Text>
            )}
          </VStack>
        </TabPanel>
        <TabPanel>
          <VStack spacing={4} align="stretch">
            {riskCategories.lowRisk.map(renderRiskCard)}
            {!riskCategories.lowRisk.length && (
              <Text color="gray.500" textAlign="center">No low risk assets found</Text>
            )}
          </VStack>
        </TabPanel>
      </TabPanels>
    </Tabs>
  )
} 