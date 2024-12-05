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

def setup_analytics():
    conn = get_snowflake_connection()
    cur = conn.cursor()
    
    try:
        # Create daily price analysis view with corrected GROUP BY
        cur.execute("""
        CREATE OR REPLACE VIEW DAILY_PRICE_ANALYSIS AS
        WITH daily_prices AS (
            SELECT 
                COIN_ID,
                DATE_TRUNC('DAY', TIMESTAMP) as DATE,
                PRICE_USD,
                VOLUME_24H_USD,
                ROW_NUMBER() OVER (PARTITION BY COIN_ID, DATE_TRUNC('DAY', TIMESTAMP) ORDER BY TIMESTAMP) as row_num_asc,
                ROW_NUMBER() OVER (PARTITION BY COIN_ID, DATE_TRUNC('DAY', TIMESTAMP) ORDER BY TIMESTAMP DESC) as row_num_desc
            FROM PRICES
        )
        SELECT 
            COIN_ID,
            DATE,
            MIN(PRICE_USD) as LOW_PRICE,
            MAX(PRICE_USD) as HIGH_PRICE,
            AVG(PRICE_USD) as AVG_PRICE,
            MAX(CASE WHEN row_num_asc = 1 THEN PRICE_USD END) as OPEN_PRICE,
            MAX(CASE WHEN row_num_desc = 1 THEN PRICE_USD END) as CLOSE_PRICE,
            AVG(VOLUME_24H_USD) as AVG_VOLUME
        FROM daily_prices
        GROUP BY COIN_ID, DATE
        ORDER BY DATE DESC
        """)

        # Update the portfolio performance view with better 24h change calculation
        cur.execute("""
        CREATE OR REPLACE VIEW PORTFOLIO_PERFORMANCE AS
        WITH latest_prices AS (
            SELECT 
                COIN_ID,
                PRICE_USD,
                PRICE_CHANGE_24H_PCT,
                TIMESTAMP,
                ROW_NUMBER() OVER (PARTITION BY COIN_ID ORDER BY TIMESTAMP DESC) as rn
            FROM PRICES
            WHERE TIMESTAMP >= DATEADD(hour, -24, CURRENT_TIMESTAMP())
        ),
        daily_changes AS (
            SELECT 
                h.CATEGORY,
                h.COIN_ID,
                h.AMOUNT,
                p.PRICE_USD,
                COALESCE(p.PRICE_CHANGE_24H_PCT, 0) as CHANGE_24H,
                h.AMOUNT * p.PRICE_USD as POSITION_VALUE
            FROM HOLDINGS h
            JOIN latest_prices p ON h.COIN_ID = p.COIN_ID AND p.rn = 1
        )
        SELECT 
            d.CATEGORY,
            SUM(d.POSITION_VALUE) as TOTAL_VALUE,
            SUM(d.POSITION_VALUE) / NULLIF(SUM(SUM(d.POSITION_VALUE)) OVER (), 0) * 100 as PERCENTAGE,
            COUNT(DISTINCT d.COIN_ID) as NUM_COINS,
            -- Calculate weighted average of 24h changes based on position value
            SUM(d.POSITION_VALUE * d.CHANGE_24H) / NULLIF(SUM(d.POSITION_VALUE), 0) as AVG_24H_CHANGE
        FROM daily_changes d
        GROUP BY d.CATEGORY
        HAVING TOTAL_VALUE > 0
        ORDER BY TOTAL_VALUE DESC
        """)

        # Add a query to verify the data
        cur.execute("""
        SELECT 
            p.COIN_ID,
            h.SYMBOL,
            p.PRICE_USD,
            p.PRICE_CHANGE_24H_PCT,
            p.TIMESTAMP,
            h.AMOUNT,
            h.AMOUNT * p.PRICE_USD as POSITION_VALUE
        FROM PRICES p
        JOIN HOLDINGS h ON h.COIN_ID = p.COIN_ID
        WHERE p.TIMESTAMP >= DATEADD(hour, -24, CURRENT_TIMESTAMP())
        ORDER BY p.TIMESTAMP DESC, POSITION_VALUE DESC;
        """)

        print("\nVerifying price data in Snowflake:")
        for row in cur.fetchall():
            print(f"{row[1]}: ${row[2]:,.2f} ({row[3]:,.2f}%) - Position: ${row[6]:,.2f}")

        # Create price alerts view
        cur.execute("""
        CREATE OR REPLACE VIEW PRICE_ALERTS AS
        WITH latest_prices AS (
            SELECT 
                COIN_ID,
                PRICE_USD,
                PRICE_CHANGE_24H_PCT,
                ROW_NUMBER() OVER (PARTITION BY COIN_ID ORDER BY TIMESTAMP DESC) as rn
            FROM PRICES
        )
        SELECT 
            h.COIN_ID,
            h.SYMBOL,
            h.NAME,
            p.PRICE_USD as CURRENT_PRICE,
            p.PRICE_CHANGE_24H_PCT,
            CASE 
                WHEN ABS(p.PRICE_CHANGE_24H_PCT) > 10 THEN 'High Volatility'
                WHEN p.PRICE_CHANGE_24H_PCT > 5 THEN 'Significant Rise'
                WHEN p.PRICE_CHANGE_24H_PCT < -5 THEN 'Significant Drop'
                ELSE 'Normal'
            END as ALERT_TYPE
        FROM HOLDINGS h
        JOIN latest_prices p ON h.COIN_ID = p.COIN_ID AND p.rn = 1
        WHERE ABS(p.PRICE_CHANGE_24H_PCT) > 5
        """)

        print("✅ Analytics views created successfully!")
        
        # Test the views
        print("\nTesting views...")
        
        print("\nPortfolio Performance by Category:")
        cur.execute("SELECT * FROM PORTFOLIO_PERFORMANCE")
        for row in cur.fetchall():
            print(f"Category: {row[0]}")
            print(f"Total Value: ${row[1]:,.2f}")
            print(f"Portfolio %: {row[2]:.1f}%")
            print(f"Number of Coins: {row[3]}")
            print(f"24h Avg Change: {row[4]:.2f}%")
            print("---")

        print("\nPrice Alerts:")
        cur.execute("SELECT * FROM PRICE_ALERTS")
        for row in cur.fetchall():
            print(f"{row[1]} ({row[2]}): {row[3]:,.2f} ({row[4]:+.1f}%) - {row[5]}")

    except Exception as e:
        print(f"❌ Error setting up analytics: {str(e)}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    setup_analytics() 