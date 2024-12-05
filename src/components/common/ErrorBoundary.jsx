import React from 'react'
import { Box, Text, Button } from '@chakra-ui/react'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error)
    console.error('Component Stack:', errorInfo.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box p={4} borderWidth="1px" borderRadius="lg" bg="red.50">
          <Text color="red.500" mb={4}>
            Something went wrong displaying this component.
          </Text>
          <Button
            size="sm"
            colorScheme="red"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Try Again
          </Button>
        </Box>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary 