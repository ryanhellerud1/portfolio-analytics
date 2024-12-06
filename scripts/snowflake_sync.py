import snowflake.connector
import os
import sys
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
        raise ValueError(f"Missing required environment variables: {', '.join(missing_vars)}")

def get_snowflake_connection():
    load_dotenv()
    validate_env_vars()
    
    try:
        account = os.getenv('SNOWFLAKE_ACCOUNT')
        region = os.getenv('SNOWFLAKE_REGION')
        account_identifier = f"{account}.{region}"
        
        print(f"Connecting to Snowflake account: {account_identifier}")
        
        conn = snowflake.connector.connect(
            user=os.getenv('SNOWFLAKE_USERNAME'),
            password=os.getenv('SNOWFLAKE_PASSWORD'),
            account=account_identifier,
            warehouse=os.getenv('SNOWFLAKE_WAREHOUSE'),
            database=os.getenv('SNOWFLAKE_DATABASE'),
            schema=os.getenv('SNOWFLAKE_SCHEMA', 'PUBLIC'),
            role=os.getenv('SNOWFLAKE_ROLE')
        )
        
        print("✅ Successfully connected to Snowflake")
        return conn
    except Exception as e:
        print(f"❌ Error connecting to Snowflake: {str(e)}")
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
        
        # Validate price data
        required_price_fields = ['coin_id', 'price_usd']
        for price in prices:
            missing_fields = [field for field in required_price_fields if field not in price]
            if missing_fields:
                raise ValueError(f"Missing required fields in price: {missing_fields}")
        
        try:
            # Update holdings
            for holding in holdings:
                print(f"Updating holding: {holding['coin_id']}")
                cur.execute("""
                MERGE INTO HOLDINGS t
                USING (SELECT %s as COIN_ID, %s as SYMBOL, %s as NAME, %s as AMOUNT, %s as CATEGORY) s
                ON t.COIN_ID = s.COIN_ID
                WHEN MATCHED THEN
                    UPDATE SET 
                        AMOUNT = s.AMOUNT,
                        CATEGORY = s.CATEGORY,
                        UPDATED_AT = CURRENT_TIMESTAMP()
                WHEN NOT MATCHED THEN
                    INSERT (COIN_ID, SYMBOL, NAME, AMOUNT, CATEGORY)
                    VALUES (s.COIN_ID, s.SYMBOL, s.NAME, s.AMOUNT, s.CATEGORY)
                """, (
                    holding['coin_id'],
                    holding['symbol'],
                    holding['name'],
                    holding['amount'],
                    holding.get('category', 'Other')
                ))
            
            # Insert new prices
            for price in prices:
                print(f"Inserting price for: {price['coin_id']}")
                cur.execute("""
                INSERT INTO PRICES (
                    COIN_ID,
                    PRICE_USD,
                    MARKET_CAP_USD,
                    VOLUME_24H_USD,
                    PRICE_CHANGE_24H_PCT
                ) VALUES (%s, %s, %s, %s, %s)
                """, (
                    price['coin_id'],
                    price['price_usd'],
                    price.get('market_cap_usd', 0),
                    price.get('volume_24h_usd', 0),
                    price.get('price_change_24h_pct', 0)
                ))
            
            conn.commit()
            print("✅ Sync completed successfully!")
            
            # Return summary
            return {
                'success': True,
                'holdings_updated': len(holdings),
                'prices_inserted': len(prices),
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            conn.rollback()
            print(f"❌ Error during sync operations: {str(e)}")
            print(f"Stack trace: {traceback.format_exc()}")
            raise
        
    except Exception as e:
        print(f"❌ Error during sync: {str(e)}")
        print(f"Stack trace: {traceback.format_exc()}")
        raise
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    try:
        # Read input data from command line argument
        if len(sys.argv) < 2:
            raise ValueError("No input data provided")
            
        data = json.loads(sys.argv[1])
        result = sync_data(data)
        print(json.dumps(result))
        
    except Exception as e:
        error_data = {
            'success': False,
            'error': str(e),
            'stack_trace': traceback.format_exc(),
            'timestamp': datetime.now().isoformat()
        }
        print(json.dumps(error_data))
        sys.exit(1) 