import json
import subprocess
import requests
from pathlib import Path

def get_current_prices(coin_ids):
    """Fetch real-time prices from CoinGecko"""
    try:
        response = requests.get(
            'https://api.coingecko.com/api/v3/simple/price',
            params={
                'ids': ','.join(coin_ids),
                'vs_currencies': 'usd',
                'include_market_cap': 'true',
                'include_24hr_vol': 'true',
                'include_24hr_change': 'true'
            }
        )
        return response.json()
    except Exception as e:
        print(f"Error fetching prices: {e}")
        return {}

# Test data structure
test_data = {
    "holdings": [
        {
            "coinId": "bitcoin",
            "symbol": "BTC",
            "name": "Bitcoin",
            "amount": 1,
            "category": "Layer 1"
        },
        {
            "coinId": "ethereum",
            "symbol": "ETH",
            "name": "Ethereum",
            "amount": 10,
            "category": "Layer 1"
        }
    ]
}

def run_sync_test():
    print("Starting sync test...")
    
    # Fetch current prices
    coin_ids = [h["coinId"] for h in test_data["holdings"]]
    current_prices = get_current_prices(coin_ids)
    
    # Add real prices to test data
    test_data["prices"] = {}
    for coin_id in coin_ids:
        if coin_id in current_prices:
            test_data["prices"][coin_id] = {
                "usd": current_prices[coin_id]["usd"],
                "usd_market_cap": current_prices[coin_id]["usd_market_cap"],
                "usd_24h_vol": current_prices[coin_id]["usd_24h_vol"],
                "usd_24h_change": current_prices[coin_id]["usd_24h_change"]
            }
    
    print("\nCurrent Prices:")
    for coin_id, price_data in test_data["prices"].items():
        print(f"{coin_id.upper()}: ${price_data['usd']:,.2f}")
    
    # Convert test data to JSON string
    test_json = json.dumps(test_data)
    
    try:
        # Run the sync script with test data
        result = subprocess.run(
            ['python', 'scripts/snowflake_sync.py', test_json],
            capture_output=True,
            text=True
        )
        
        # Print output
        print("\nSync Output:")
        print(result.stdout)
        
        if result.stderr:
            print("\nErrors:")
            print(result.stderr)
            
        if result.returncode == 0:
            print("\n✅ Sync test completed successfully!")
        else:
            print("\n❌ Sync test failed!")
            
    except Exception as e:
        print(f"\n❌ Error running sync test: {str(e)}")

if __name__ == "__main__":
    run_sync_test() 