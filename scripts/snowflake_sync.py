import os
import sys

# Print debug info to stderr so it doesn't interfere with JSON output
def print_debug(*args, **kwargs):
    print(*args, file=sys.stderr, **kwargs)

print_debug("=== Python Environment Debug ===")
print_debug(f"Python version: {sys.version}")
print_debug(f"Python executable: {sys.executable}")
print_debug(f"Python path: {sys.path}")
print_debug(f"Current working directory: {os.getcwd()}")
print_debug(f"Environment variables:")
for key, value in os.environ.items():
    if key.startswith(('PYTHON', 'VIRTUAL', 'PATH')):
        print_debug(f"  {key}: {value}")
print_debug("===========================")

try:
    import snowflake.connector
    print_debug("✅ Successfully imported snowflake.connector")
except ImportError as e:
    print_debug(f"❌ Failed to import snowflake.connector: {e}")
    print_debug("Attempting pip install...")
    import subprocess
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "snowflake-connector-python==3.6.0"])
        import snowflake.connector
        print_debug("✅ Successfully installed and imported snowflake.connector")
    except Exception as e:
        print_debug(f"❌ Failed to install snowflake.connector: {e}")
        raise

import json
import traceback
from datetime import datetime
from dotenv import load_dotenv

def validate_env_vars():
    required_vars = [
        'SNOWFLAKE_ACCOUNT',
        'SNOWFLAKE_USERNAME',
        'SNOWFLAKE_PASSWORD',
        'SNOWFLAKE_DATABASE',
        'SNOWFLAKE_WAREHOUSE',
        'SNOWFLAKE_ROLE',
        'SNOWFLAKE_REGION'
    ]
    
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    if missing_vars:
        error_msg = f"Missing required environment variables: {', '.join(missing_vars)}"
        print(f"❌ {error_msg}")
        raise ValueError(error_msg)
    
    print("✅ All required environment variables are set")

def get_snowflake_connection():
    load_dotenv()
    validate_env_vars()
    
    try:
        account = os.getenv('SNOWFLAKE_ACCOUNT')
        region = os.getenv('SNOWFLAKE_REGION')
        
        # Format account identifier correctly for Snowflake
        account_identifier = f"{account}.{region}.snowflakecomputing.com"
        
        print(f"Connecting to Snowflake account: {account_identifier}")
        print(f"Using warehouse: {os.getenv('SNOWFLAKE_WAREHOUSE')}")
        print(f"Using database: {os.getenv('SNOWFLAKE_DATABASE')}")
        print(f"Using role: {os.getenv('SNOWFLAKE_ROLE')}")
        
        conn = snowflake.connector.connect(
            user=os.getenv('SNOWFLAKE_USERNAME'),
            password=os.getenv('SNOWFLAKE_PASSWORD'),
            account=account,  # Use just the account name, not the full URL
            region=region,    # Specify region separately
            warehouse=os.getenv('SNOWFLAKE_WAREHOUSE'),
            database=os.getenv('SNOWFLAKE_DATABASE'),
            schema=os.getenv('SNOWFLAKE_SCHEMA', 'PUBLIC'),
            role=os.getenv('SNOWFLAKE_ROLE')
        )
        
        print("✅ Successfully connected to Snowflake")
        return conn
    except Exception as e:
        error_msg = f"Error connecting to Snowflake: {str(e)}"
        print(f"❌ {error_msg}")
        print(f"Connection details (sanitized):")
        print(f"- Account: {account}")
        print(f"- Region: {region}")
        print(f"- Username: {os.getenv('SNOWFLAKE_USERNAME')}")
        print(f"- Database: {os.getenv('SNOWFLAKE_DATABASE')}")
        print(f"- Warehouse: {os.getenv('SNOWFLAKE_WAREHOUSE')}")
        print(f"- Role: {os.getenv('SNOWFLAKE_ROLE')}")
        raise

def sync_data(data):
    try:
        conn = get_snowflake_connection()
        cur = conn.cursor()
        
        # Extract holdings and prices from input data
        holdings = data.get('holdings', [])
        prices = data.get('prices', [])
        
        print(f"Processing {len(holdings)} holdings and {len(prices)} prices")
        
        # Validate holdings data
        required_holding_fields = ['coin_id', 'symbol', 'name', 'amount']
        for holding in holdings:
            missing_fields = [field for field in required_holding_fields if field not in holding]
            if missing_fields:
                raise ValueError(f"Missing required fields in holding: {missing_fields}")
        
        # Validate prices data
        required_price_fields = ['coin_id', 'price_usd']
        for price in prices:
            missing_fields = [field for field in required_price_fields if field not in price]
            if missing_fields:
                raise ValueError(f"Missing required fields in price: {missing_fields}")
        
        # Begin transaction
        cur.execute("BEGIN")
        
        try:
            # Clear existing holdings
            cur.execute("DELETE FROM HOLDINGS")
            
            # Insert new holdings
            for holding in holdings:
                cur.execute("""
                INSERT INTO HOLDINGS (
                    COIN_ID,
                    SYMBOL,
                    NAME,
                    AMOUNT,
                    CATEGORY
                ) VALUES (%s, %s, %s, %s, %s)
                """, (
                    holding['coin_id'],
                    holding['symbol'],
                    holding['name'],
                    holding['amount'],
                    holding.get('category', 'Other')
                ))
            
            # Insert new prices
            timestamp = datetime.utcnow().isoformat()
            for price in prices:
                cur.execute("""
                INSERT INTO PRICES (
                    COIN_ID,
                    TIMESTAMP,
                    PRICE_USD,
                    MARKET_CAP_USD,
                    VOLUME_24H_USD,
                    PRICE_CHANGE_24H_PCT
                ) VALUES (%s, %s, %s, %s, %s, %s)
                """, (
                    price['coin_id'],
                    timestamp,
                    price['price_usd'],
                    price.get('market_cap_usd', 0),
                    price.get('volume_24h_usd', 0),
                    price.get('price_change_24h_pct', 0)
                ))
            
            # Commit transaction
            cur.execute("COMMIT")
            print("✅ Sync completed successfully!")
            
            return {
                'status': 'success',
                'message': 'Data synced successfully',
                'details': {
                    'holdings_count': len(holdings),
                    'prices_count': len(prices),
                    'timestamp': timestamp
                }
            }
            
        except Exception as e:
            # Rollback on error
            cur.execute("ROLLBACK")
            raise e
            
    except Exception as e:
        error_msg = f"Error syncing data: {str(e)}"
        print(f"❌ {error_msg}")
        print("Stack trace:")
        traceback.print_exc()
        return {
            'status': 'error',
            'message': error_msg,
            'details': {
                'type': type(e).__name__,
                'trace': traceback.format_exc()
            }
        }
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()

if __name__ == '__main__':
    try:
        # Read input data from command line argument
        if len(sys.argv) < 2:
            raise ValueError("No input data provided")
            
        input_data = json.loads(sys.argv[1])
        result = sync_data(input_data)
        print(json.dumps(result))
    except Exception as e:
        error_result = {
            'status': 'error',
            'message': str(e),
            'details': {
                'type': type(e).__name__,
                'trace': traceback.format_exc()
            }
        }
        print(json.dumps(error_result))
        sys.exit(1) 