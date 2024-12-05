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

  const renderRiskCard = (item) => (
    <Box key={item.SYMBOL} p={4} borderWidth="1px" borderRadius="md">
      <HStack justify="space-between" mb={2}>
        <Text fontWeight="bold">{item.SYMBOL}</Text>
        <Badge colorScheme={item.RISK_CATEGORY === 'HIGH_RISK' ? 'red' : 
          item.RISK_CATEGORY === 'MEDIUM_RISK' ? 'yellow' : 'green'}>
          {item.RISK_CATEGORY.replace('_', ' ')}
        </Badge>
      </HStack>
      <Grid templateColumns="repeat(3, 1fr)" gap={4}>
        <Stat>
          <StatLabel>Daily Volatility</StatLabel>
          <StatNumber>{item.DAILY_VOLATILITY.toFixed(2)}%</StatNumber>
        </Stat>
        <Stat>
          <StatLabel>Sharpe Ratio</StatLabel>
          <StatNumber>{item.SHARPE_RATIO.toFixed(2)}</StatNumber>
        </Stat>
        <Stat>
          <StatLabel>Value at Risk (95%)</StatLabel>
          <StatNumber>{item.VAR_95.toFixed(2)}%</StatNumber>
        </Stat>
        <Stat>
          <StatLabel>Max 7D Return</StatLabel>
          <StatNumber>
            <StatArrow type="increase" />
            {item.MAX_7D_RETURN.toFixed(2)}%
          </StatNumber>
        </Stat>
        <Stat>
          <StatLabel>Min 7D Return</StatLabel>
          <StatNumber>
            <StatArrow type="decrease" />
            {item.MIN_7D_RETURN.toFixed(2)}%
          </StatNumber>
        </Stat>
        <Stat>
          <StatLabel>Max Drawdown</StatLabel>
          <StatNumber>
            <StatArrow type="decrease" />
            {Math.abs(item.MAX_DRAWDOWN).toFixed(2)}%
          </StatNumber>
        </Stat>
      </Grid>
    </Box>
  )

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