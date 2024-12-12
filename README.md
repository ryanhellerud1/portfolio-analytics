# portfolio-analytics
# Crypto Portfolio Tracker
Deployed: https://main--portfolio-metrics.netlify.app/

A full-stack application for tracking cryptocurrency portfolios with real-time price updates and analytics.

## Features

- Real-time cryptocurrency price tracking
- Portfolio management with categories
- Analytics dashboard with performance metrics
- Snowflake integration for data warehousing
- Price alerts for significant market movements

## Tech Stack

- Frontend: React + Vite
- UI: Chakra UI
- Backend: Node.js + Express
- Database: Snowflake
- APIs: CoinGecko
- Analytics: Custom Snowflake views

## Setup

1. Clone the repository:

```bash
git clone <repository-url>
cd crypto-tracker
```

2. Install dependencies:

```bash
npm install
python -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\activate
pip install -r requirements.txt
```

3. Set up environment variables:
Create a `.env` file in the root directory with:

```env
# CoinGecko API Configuration
COINGECKO_API_KEY=your_api_key
COINGECKO_API_URL=https://api.coingecko.com/api/v3

# Server Configuration
PORT=3001

# Snowflake Configuration
SNOWFLAKE_USERNAME=your_username
SNOWFLAKE_PASSWORD=your_password
SNOWFLAKE_ACCOUNT=your_account
SNOWFLAKE_REGION=your_region
SNOWFLAKE_WAREHOUSE=your_warehouse
SNOWFLAKE_DATABASE=your_database
SNOWFLAKE_SCHEMA=your_schema

# Python Configuration
PYTHON_PATH=./venv/bin/python
PYTHONPATH=./venv/lib/python3.x/site-packages
```

4. Initialize Snowflake:

```bash
npm run setup-snowflake
npm run setup-analytics
```

5. Start the development server:

```bash
npm run dev
npm run server
```

## Scripts

- `npm run dev`: Start Vite development server
- `npm run build`: Build for production
- `npm run server`: Start Express server
- `npm run setup-python`: Set up Python environment
- `npm run setup-snowflake`: Initialize Snowflake tables
- `npm run setup-analytics`: Set up Snowflake analytics views
- `npm run test-snowflake`: Test Snowflake connection
- `npm run test-sync`: Test data synchronization

## Project Structure

```
crypto-tracker/
├── src/                    # Frontend React code
│   ├── components/         # React components
│   ├── context/           # React context providers
│   ├── services/          # API services
│   └── utils/             # Utility functions
├── scripts/               # Python scripts for Snowflake
│   ├── setup_snowflake.py       # Database setup
│   ├── setup_analytics.py       # Analytics views
│   ├── test_snowflake.py       # Connection testing
│   └── snowflake_sync.py       # Data sync logic
├── server.js              # Express backend server
└── vite.config.js         # Vite configuration
```

## Snowflake Setup

The application uses several Snowflake tables and views:

- `HOLDINGS`: Stores portfolio holdings
- `PRICES`: Stores historical price data
- `PORTFOLIO_PERFORMANCE`: Analytics view for category performance
- `PRICE_ALERTS`: View for price movement alerts
- `DAILY_PRICE_ANALYSIS`: View for daily price metrics

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [CoinGecko API](https://www.coingecko.com/en/api) for cryptocurrency data
- [Snowflake](https://www.snowflake.com/) for data warehousing
- [Chakra UI](https://chakra-ui.com/) for the user interface
