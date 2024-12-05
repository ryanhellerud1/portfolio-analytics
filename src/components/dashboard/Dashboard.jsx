import { Box, Grid, Heading, Tabs, TabList, TabPanels, TabPanel, Tab, VStack, GridItem } from '@chakra-ui/react'
import PortfolioSummary from './PortfolioSummary'
import PortfolioManager from '../portfolio/PortfolioManager'
import WatchList from '../watchlist/WatchList'
import PortfolioClassification from '../portfolio/PortfolioClassification'
import PortfolioAnalytics from '../analytics/PortfolioAnalytics'
import ErrorBoundary from '../ErrorBoundary'

function Dashboard() {
  return (
    <Box p={4}>
      <Heading mb={6}>Crypto Portfolio Dashboard</Heading>
      <ErrorBoundary>
        <Tabs>
          <TabList>
            <Tab>Overview</Tab>
            <Tab>Manage Portfolio</Tab>
            <Tab>Analytics</Tab>
          </TabList>

          <TabPanels>
            {/* Overview Tab */}
            <TabPanel>
              <Grid templateColumns="repeat(12, 1fr)" gap={6}>
                <GridItem colSpan={12} lg={8}>
                  <ErrorBoundary>
                    <WatchList />
                  </ErrorBoundary>
                </GridItem>
                <GridItem colSpan={12} lg={4}>
                  <VStack spacing={6}>
                    <ErrorBoundary>
                      <PortfolioSummary />
                    </ErrorBoundary>
                    <ErrorBoundary>
                      <PortfolioClassification />
                    </ErrorBoundary>
                  </VStack>
                </GridItem>
              </Grid>
            </TabPanel>

            {/* Manage Portfolio Tab */}
            <TabPanel>
              <ErrorBoundary>
                <PortfolioManager />
              </ErrorBoundary>
            </TabPanel>

            {/* Analytics Tab */}
            <TabPanel>
              <ErrorBoundary>
                <PortfolioAnalytics />
              </ErrorBoundary>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </ErrorBoundary>
    </Box>
  )
}

export default Dashboard 