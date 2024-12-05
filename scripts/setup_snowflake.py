import snowflake.connector
import os
from dotenv import load_dotenv
from pathlib import Path

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

def setup_database():
    conn = get_snowflake_connection()
    cur = conn.cursor()
    
    try:
        # Create holdings table
        cur.execute("""
        CREATE TABLE IF NOT EXISTS HOLDINGS (
            ID NUMBER AUTOINCREMENT,
            COIN_ID STRING NOT NULL,
            SYMBOL STRING NOT NULL,
            NAME STRING NOT NULL,
            AMOUNT FLOAT NOT NULL,
            CATEGORY STRING,
            CREATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
            UPDATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
            PRIMARY KEY (ID)
        )
        """)

        # Create prices table
        cur.execute("""
        CREATE TABLE IF NOT EXISTS PRICES (
            ID NUMBER AUTOINCREMENT,
            COIN_ID STRING NOT NULL,
            PRICE_USD FLOAT,
            MARKET_CAP_USD FLOAT,
            VOLUME_24H_USD FLOAT,
            PRICE_CHANGE_24H_PCT FLOAT,
            TIMESTAMP TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
            PRIMARY KEY (ID)
        )
        """)

        # Create portfolio analysis view
        cur.execute("""
        CREATE OR REPLACE VIEW PORTFOLIO_ANALYSIS AS
        SELECT 
            h.COIN_ID,
            h.SYMBOL,
            h.NAME,
            h.AMOUNT,
            h.CATEGORY,
            p.PRICE_USD,
            h.AMOUNT * p.PRICE_USD as TOTAL_VALUE_USD,
            p.PRICE_CHANGE_24H_PCT,
            p.MARKET_CAP_USD,
            p.TIMESTAMP as PRICE_TIMESTAMP
        FROM HOLDINGS h
        LEFT JOIN (
            SELECT DISTINCT FIRST_VALUE(ID) OVER (PARTITION BY COIN_ID ORDER BY TIMESTAMP DESC) as LATEST_ID,
            COIN_ID
            FROM PRICES
        ) latest ON h.COIN_ID = latest.COIN_ID
        LEFT JOIN PRICES p ON latest.LATEST_ID = p.ID
        """)

        print("✅ Database setup completed successfully!")
        
        # Verify tables were created
        cur.execute("SHOW TABLES")
        print("\nCreated Tables:")
        for table in cur.fetchall():
            print(f"- {table[1]}")
            
        cur.execute("SHOW VIEWS")
        print("\nCreated Views:")
        for view in cur.fetchall():
            print(f"- {view[1]}")

    except Exception as e:
        print(f"❌ Error setting up database: {str(e)}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    setup_database() 