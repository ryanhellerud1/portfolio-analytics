import { Box, Text, VStack, HStack } from '@chakra-ui/react'
import { Pie } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import { useCrypto } from '../../context/CryptoContext'
import { CLASSIFICATION_COLORS } from '../../utils/coinClassifications'
import { useEffect, useRef } from 'react'
import ErrorBoundary from '../common/ErrorBoundary'

// Register ChartJS components
ChartJS.register(ArcElement, Tooltip, Legend)

// Separate Chart component to handle cleanup
function PieChart({ data, options }) {
  const chartRef = useRef(null)

  useEffect(() => {
    // Cleanup function to destroy chart instance
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy()
      }
    }
  }, [])

  return (
    <Pie ref={chartRef} data={data} options={options} />
  )
}

// Portfolio breakdown component
function PortfolioBreakdown({ holdings, prices }) {
  // Calculate value per classification
  const classificationValues = holdings.reduce((acc, holding) => {
    const classification = holding.category || 'Other'
    const price = prices[holding.coinId]?.usd || 0
    const value = price * holding.amount
    acc[classification] = (acc[classification] || 0) + value
    return acc
  }, {})

  // Filter out zero values
  const validClassifications = Object.entries(classificationValues)
    .filter(([_, value]) => value > 0)
    .reduce((acc, [key, value]) => {
      acc[key] = value
      return acc
    }, {})

  // Prepare chart data
  const chartData = {
    labels: Object.keys(validClassifications),
    datasets: [{
      data: Object.values(validClassifications),
      backgroundColor: Object.keys(validClassifications).map(c => 
        CLASSIFICATION_COLORS[c] || CLASSIFICATION_COLORS['Other']
      ),
      borderWidth: 1
    }]
  }

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 20
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = context.raw
            const total = context.dataset.data.reduce((a, b) => a + b, 0)
            const percentage = ((value / total) * 100).toFixed(1)
            return [
              `${context.label}`,
              `Value: $${value.toLocaleString()}`,
              `Share: ${percentage}%`
            ]
          }
        }
      }
    }
  }

  // Calculate total and percentages
  const total = Object.values(validClassifications).reduce((a, b) => a + b, 0)
  const percentages = Object.entries(validClassifications)
    .map(([type, value]) => ({
      type,
      percentage: ((value / total) * 100).toFixed(1),
      value
    }))
    .sort((a, b) => b.value - a.value)

  if (total === 0) {
    return (
      <Text textAlign="center" color="gray.500" mt={10}>
        No portfolio data to display
      </Text>
    )
  }

  return (
    <>
      <Box height="300px" position="relative">
        <PieChart data={chartData} options={chartOptions} />
      </Box>
      <Box>
        {percentages.map(({ type, percentage, value }) => (
          <HStack key={type} justify="space-between" py={1}>
            <HStack>
              <Box 
                w="3" 
                h="3" 
                borderRadius="full" 
                bg={CLASSIFICATION_COLORS[type]} 
              />
              <Text fontSize="sm">{type}</Text>
            </HStack>
            <Text fontSize="sm" color="gray.600">
              ${value.toLocaleString()} ({percentage}%)
            </Text>
          </HStack>
        ))}
      </Box>
    </>
  )
}

// Main component with error boundary
function PortfolioClassification() {
  const { holdings, prices } = useCrypto()

  return (
    <ErrorBoundary>
      <Box borderWidth="1px" borderRadius="lg" p={4}>
        <Text fontSize="xl" mb={4}>Portfolio Classification</Text>
        <VStack spacing={4} align="stretch">
          <PortfolioBreakdown holdings={holdings} prices={prices} />
        </VStack>
      </Box>
    </ErrorBoundary>
  )
}

export default PortfolioClassification 