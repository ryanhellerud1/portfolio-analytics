import { 
  Box, 
  VStack, 
  Text, 
  Progress, 
  Alert, 
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Grid,
  GridItem,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  useColorModeValue,
  Spinner,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel
} from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { useSync } from '../../context/SyncContext'
import { analyticsApi } from '../../services/analyticsApi'
import TechnicalIndicators from './TechnicalIndicators'
import VolatilityAnalysis from './VolatilityAnalysis'
import PriceMomentum from './PriceMomentum'

function PortfolioAnalytics() {
  const [performance, setPerformance] = useState([])
  const [alerts, setAlerts] = useState([])
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const { lastSyncTime } = useSync()
  const bgColor = useColorModeValue('white', 'gray.700')

  useEffect(() => {
    fetchAnalytics()
  }, [lastSyncTime])

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Fetch portfolio performance using analyticsApi
      const perfData = await analyticsApi.getPerformance()
      console.log('Raw performance data:', perfData)
      
      if (perfData.error) {
        throw new Error(perfData.error)
      }
      
      if (!perfData.data) {
        throw new Error('No performance data received')
      }
      
      // Ensure data is an array and values are numbers
      const formattedPerformance = perfData.data.map(item => ({
        category: item.category || 'Other',
        total_value: Number(item.total_value) || 0,
        percentage: Number(item.percentage) || 0,
        num_coins: Number(item.num_coins) || 0,
        avg_24h_change: Number(item.avg_24h_change) || 0
      }))
      
      console.log('Formatted performance data:', formattedPerformance)
      setPerformance(formattedPerformance)

      // Fetch price alerts using analyticsApi
      const alertsData = await analyticsApi.getAlerts()
      
      if (alertsData.error) {
        throw new Error(alertsData.error)
      }

      if (!alertsData.data) {
        throw new Error('No alerts data received')
      }
      
      setAlerts(alertsData.data)
    } catch (error) {
      console.error('Error fetching analytics:', error)
      setError(error.message || 'Failed to fetch analytics')
    } finally {
      setIsLoading(false)
    }
  }

  const getAlertStatus = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'warning':
        return 'warning'
      case 'info':
        return 'info'
      case 'low':
        return 'success'
      default:
        return 'info'  // default fallback
    }
  }

  const renderAlerts = () => {
    if (!alerts || !alerts.length) {
      return (
        <Alert status="info">
          <AlertIcon />
          No active alerts at this time
        </Alert>
      )
    }

    return alerts.map((alert, index) => (
      <Alert
        key={`${alert.coin}-${index}`}
        status={getAlertStatus(alert.severity)}
        variant="left-accent"
        mb={2}
      >
        <AlertIcon />
        <Box flex="1">
          <AlertTitle>{alert.coin}</AlertTitle>
          <AlertDescription>
            {alert.message}
          </AlertDescription>
        </Box>
      </Alert>
    ))
  }

  if (isLoading) {
    return (
      <Box textAlign="center" py={10}>
        <Spinner size="xl" />
        <Text mt={4}>Loading analytics...</Text>
      </Box>
    )
  }

  if (error) {
    return (
      <Alert status="error">
        <AlertIcon />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <VStack spacing={6} w="full">
      {/* Portfolio Performance */}
      <Box p={5} shadow="md" borderWidth="1px" w="full" bg={bgColor}>
        <Text fontSize="xl" fontWeight="bold" mb={4}>
          Portfolio Performance by Category
        </Text>
        {performance.length > 0 ? (
          <Grid templateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap={6}>
            {performance.map(cat => (
              <GridItem key={cat.category}>
                <Stat>
                  <StatLabel>{cat.category}</StatLabel>
                  <StatNumber>
                    ${cat.total_value.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </StatNumber>
                  <StatHelpText>
                    <StatArrow 
                      type={cat.avg_24h_change >= 0 ? 'increase' : 'decrease'} 
                    />
                    {cat.avg_24h_change.toFixed(2)}%
                  </StatHelpText>
                  <Progress 
                    value={cat.percentage} 
                    size="sm" 
                    colorScheme={cat.avg_24h_change >= 0 ? 'green' : 'red'} 
                  />
                  <Text fontSize="sm" color="gray.500" mt={1}>
                    {cat.num_coins} coin{cat.num_coins !== 1 ? 's' : ''}
                  </Text>
                </Stat>
              </GridItem>
            ))}
          </Grid>
        ) : (
          <Text color="gray.500" textAlign="center">No portfolio data available</Text>
        )}
      </Box>

      {/* Analytics Tabs */}
      <Box p={5} shadow="md" borderWidth="1px" w="full" bg={bgColor}>
        <Box mb={6}>
          <Text fontSize="2xl" fontWeight="bold" mb={2}>
            Market Analysis Dashboard
          </Text>
          <Text color="gray.600" _dark={{ color: 'gray.300' }}>
            Monitor your portfolio with advanced analytics including technical indicators, risk metrics, and price momentum signals.
          </Text>
        </Box>

        <Tabs variant="enclosed">
          <TabList>
            <Tab>Technical Analysis</Tab>
            <Tab>Risk Analysis</Tab>
            <Tab>Price Momentum</Tab>
          </TabList>

          <TabPanels>
            <TabPanel>
              <TechnicalIndicators />
            </TabPanel>
            <TabPanel>
              <VolatilityAnalysis />
            </TabPanel>
            <TabPanel>
              <PriceMomentum />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>

      {/* Price Alerts */}
      <Box p={4} bg={bgColor} borderRadius="lg" shadow="sm" w="full">
        <Text fontSize="lg" fontWeight="bold" mb={4}>
          Price Alerts
        </Text>
        <VStack spacing={2} align="stretch">
          {renderAlerts()}
        </VStack>
      </Box>
    </VStack>
  )
}

export default PortfolioAnalytics 