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

      // Fetch portfolio performance
      const perfResponse = await fetch('/api/analytics/performance')
      const perfData = await perfResponse.json()
      
      console.log('Raw performance data:', perfData)
      
      if (perfData.error) {
        throw new Error(perfData.error)
      }
      
      // Ensure data is an array and values are numbers
      const formattedPerformance = (perfData.data || []).map(item => ({
        category: item.category || 'Other',
        total_value: Number(item.total_value) || 0,
        percentage: Number(item.percentage) || 0,
        num_coins: Number(item.num_coins) || 0,
        avg_24h_change: Number(item.avg_24h_change) || 0
      }))
      
      console.log('Formatted performance data:', formattedPerformance)
      setPerformance(formattedPerformance)

      // Fetch price alerts
      const alertsResponse = await fetch('/api/analytics/alerts')
      const alertsData = await alertsResponse.json()
      
      if (alertsData.error) {
        throw new Error(alertsData.error)
      }
      
      // Ensure data is an array and values are numbers
      const formattedAlerts = (alertsData.data || []).map(alert => ({
        coin_id: alert.coin_id || '',
        symbol: alert.symbol || '',
        name: alert.name || '',
        current_price: Number(alert.current_price) || 0,
        price_change_24h_pct: Number(alert.price_change_24h_pct) || 0,
        alert_type: alert.alert_type || 'Normal'
      }))
      
      setAlerts(formattedAlerts)
    } catch (error) {
      console.error('Error fetching analytics:', error)
      setError(error.message || 'Failed to fetch analytics')
    } finally {
      setIsLoading(false)
    }
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
      <Box p={5} shadow="md" borderWidth="1px" w="full" bg={bgColor}>
        <Text fontSize="xl" fontWeight="bold" mb={4}>
          Price Alerts
        </Text>
        <VStack spacing={3} align="stretch">
          {alerts.length > 0 ? alerts.map(alert => (
            <Alert
              key={alert.coin_id}
              status={
                alert.alert_type === 'High Volatility' ? 'warning' :
                alert.alert_type === 'Significant Rise' ? 'success' :
                alert.alert_type === 'Significant Drop' ? 'error' :
                'info'
              }
            >
              <AlertIcon />
              <Box>
                <AlertTitle>{alert.symbol} ({alert.name})</AlertTitle>
                <AlertDescription>
                  Current Price: ${alert.current_price.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                  <br />
                  24h Change: {alert.price_change_24h_pct.toFixed(2)}%
                  <br />
                  Status: {alert.alert_type}
                </AlertDescription>
              </Box>
            </Alert>
          )) : (
            <Text color="gray.500">No price alerts at this time</Text>
          )}
        </VStack>
      </Box>
    </VStack>
  )
}

export default PortfolioAnalytics 