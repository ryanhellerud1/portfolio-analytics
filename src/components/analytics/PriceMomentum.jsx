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
      if (!data.data) throw new Error('No momentum data received')
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
      strong: [],
      moderate: [],
      weak: []
    }

    const sortedData = [...momentum].sort((a, b) => Math.abs(b.momentum_score) - Math.abs(a.momentum_score))
    
    return {
      all: sortedData,
      strong: sortedData.filter(item => item.strength === 'strong'),
      moderate: sortedData.filter(item => item.strength === 'moderate'),
      weak: sortedData.filter(item => item.strength === 'weak')
    }
  }, [momentum])

  const getTrendColor = (trend, strength) => {
    if (trend === 'bullish') {
      return strength === 'strong' ? 'green' : strength === 'moderate' ? 'teal' : 'cyan'
    } else {
      return strength === 'strong' ? 'red' : strength === 'moderate' ? 'orange' : 'yellow'
    }
  }

  const formatMomentum = (value) => {
    if (value === null || value === undefined) return '0.00'
    return (Number(value) * 100).toFixed(2)
  }

  const renderMomentumCard = (item) => (
    <Box key={item.coin} p={4} borderWidth="1px" borderRadius="md">
      <HStack justify="space-between" mb={2}>
        <Text fontWeight="bold">{item.coin}</Text>
        <Badge colorScheme={getTrendColor(item.trend, item.strength)}>
          {item.trend.toUpperCase()} ({item.strength})
        </Badge>
      </HStack>
      <Stat>
        <StatLabel>Momentum Score</StatLabel>
        <StatNumber>
          <StatArrow type={item.trend === 'bullish' ? 'increase' : 'decrease'} />
          {formatMomentum(item.momentum_score)}%
        </StatNumber>
        <StatHelpText>
          {item.strength.charAt(0).toUpperCase() + item.strength.slice(1)} {item.trend}
        </StatHelpText>
      </Stat>
    </Box>
  )

  if (isLoading) return (
    <Box p={4} textAlign="center">
      <Spinner size="xl" />
      <Text mt={4}>Loading momentum analysis...</Text>
    </Box>
  )

  if (error) return (
    <Alert status="error">
      <AlertIcon />
      {error}
    </Alert>
  )

  if (!processedMomentumData.all.length) return (
    <Alert status="info">
      <AlertIcon />
      No momentum data available
    </Alert>
  )

  return (
    <Box bg={bgColor} p={4} borderRadius="lg" shadow="sm">
      <Tabs variant="enclosed">
        <TabList>
          <Tab>All ({processedMomentumData.all.length})</Tab>
          <Tab>Strong ({processedMomentumData.strong.length})</Tab>
          <Tab>Moderate ({processedMomentumData.moderate.length})</Tab>
          <Tab>Weak ({processedMomentumData.weak.length})</Tab>
        </TabList>

        <TabPanels>
          <TabPanel>
            <VStack spacing={4} align="stretch">
              {processedMomentumData.all.map(item => renderMomentumCard(item))}
            </VStack>
          </TabPanel>
          <TabPanel>
            <VStack spacing={4} align="stretch">
              {processedMomentumData.strong.map(item => renderMomentumCard(item))}
            </VStack>
          </TabPanel>
          <TabPanel>
            <VStack spacing={4} align="stretch">
              {processedMomentumData.moderate.map(item => renderMomentumCard(item))}
            </VStack>
          </TabPanel>
          <TabPanel>
            <VStack spacing={4} align="stretch">
              {processedMomentumData.weak.map(item => renderMomentumCard(item))}
            </VStack>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  )
} 