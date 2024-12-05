import sys
import os
import subprocess
import json
from datetime import datetime

def ensure_module(module_name, package_name=None):
    try:
        __import__(module_name)
        print(f"{module_name} imported successfully")
    except ImportError:
        package = package_name or module_name
        print(f"Installing {package}...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", package])
        __import__(module_name)
        print(f"{package} installed and imported successfully")

print("Python executable:", sys.executable)
print("Python path:", sys.path)
print("Current working directory:", os.getcwd())

# Install required packages
ensure_module('dotenv', 'python-dotenv')
ensure_module('snowflake.connector', 'snowflake-connector-python')

# Now import after ensuring packages are installed
from dotenv import load_dotenv
import snowflake.connector

def get_snowflake_connection():
    load_dotenv()
    
    account = os.getenv('SNOWFLAKE_ACCOUNT')
    region = os.getenv('SNOWFLAKE_REGION')
    account_identifier = f"{account}.{region}"
    
    return snowflake.connector.connect(
        user=os.getenv('SNOWFLAKE_USERNAME'),
        password=os.getenv('SNOWFLAKE_PASSWORD'),
        account=account_identifier,
        warehouse=os.getenv('SNOWFLAKE_WAREHOUSE'),
        database=os.getenv('SNOWFLAKE_DATABASE'),
        schema=os.getenv('SNOWFLAKE_SCHEMA'),
        insecure_mode=True,
        client_session_keep_alive=True
    )

def sync_holdings(holdings):
    try:
        conn = get_snowflake_connection()
        cur = conn.cursor()
        
        # First, clear existing holdings
        cur.execute("DELETE FROM HOLDINGS")
        
        # Insert new holdings
        insert_query = """
        INSERT INTO HOLDINGS (COIN_ID, SYMBOL, NAME, AMOUNT, CATEGORY)
        VALUES (%s, %s, %s, %s, %s)
        """
        
        for holding in holdings:
            cur.execute(insert_query, (
                holding['coinId'],
                holding['symbol'],
                holding['name'],
                holding['amount'],
                holding.get('category', 'Other')  # Default to 'Other' if category not set
            ))
        
        conn.commit()
        print(f"Successfully synced {len(holdings)} holdings")
        
        # Verify the sync
        cur.execute("SELECT COUNT(*) FROM HOLDINGS")
        count = cur.fetchone()[0]
        print(f"Total holdings in database: {count}")
        
    except Exception as e:
        print(f"Error syncing holdings: {str(e)}")
        raise
    finally:
        if 'conn' in locals():
            conn.close()

def sync_prices(prices):
    try:
        conn = get_snowflake_connection()
        cur = conn.cursor()
        
        timestamp = datetime.now()
        
        print("\nInserting price data:")
        for coin_id, data in prices.items():
            price_data = {
                'coin_id': coin_id,
                'price': data.get('usd', 0),
                'change': data.get('usd_24h_change', 0),
                'volume': data.get('usd_24h_vol', 0),
                'market_cap': data.get('usd_market_cap', 0)
            }
            print(f"{coin_id}: ${price_data['price']:,.2f} ({price_data['change']:,.2f}%)")
            
            cur.execute("""
                INSERT INTO PRICES (
                    COIN_ID, 
                    TIMESTAMP,
                    PRICE_USD, 
                    MARKET_CAP_USD, 
                    VOLUME_24H_USD, 
                    PRICE_CHANGE_24H_PCT
                )
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (
                coin_id,
                timestamp,
                price_data['price'],
                price_data['market_cap'],
                price_data['volume'],
                price_data['change']
            ))
        
        conn.commit()
        
        # Verify the inserted data
        cur.execute("""
            SELECT 
                h.SYMBOL,
                p.PRICE_USD,
                p.PRICE_CHANGE_24H_PCT,
                h.AMOUNT,
                h.AMOUNT * p.PRICE_USD as POSITION_VALUE
            FROM PRICES p
            JOIN HOLDINGS h ON h.COIN_ID = p.COIN_ID
            WHERE p.TIMESTAMP = %s
            ORDER BY POSITION_VALUE DESC
        """, (timestamp,))
        
        print("\nVerifying inserted data:")
        for row in cur.fetchall():
            print(f"{row[0]}: ${row[1]:,.2f} ({row[2]:,.2f}%) - Position: ${row[4]:,.2f}")
            
    except Exception as e:
        print(f"Error syncing prices: {str(e)}")
        raise
    finally:
        if 'conn' in locals():
            conn.close()

def main():
    try:
        # Get holdings data from command line argument
        if len(sys.argv) < 2:
            print("No holdings data provided")
            return
        
        data = json.loads(sys.argv[1])
        
        # Sync holdings
        sync_holdings(data['holdings'])
        
        # If prices are provided, sync them too
        if 'prices' in data:
            sync_prices(data['prices'])
            
        print("Sync completed successfully")
        
    except Exception as e:
        print(f"Error in sync script: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main() 