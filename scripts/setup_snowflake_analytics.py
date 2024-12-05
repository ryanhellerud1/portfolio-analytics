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

        # Add these new analytical views

        # 1. Moving Averages and RSI
        cur.execute("""
        CREATE OR REPLACE VIEW TECHNICAL_INDICATORS AS
        WITH price_changes AS (
            SELECT 
                COIN_ID,
                TIMESTAMP,
                PRICE_USD,
                LAG(PRICE_USD) OVER (PARTITION BY COIN_ID ORDER BY TIMESTAMP) as PREV_PRICE,
                AVG(PRICE_USD) OVER (
                    PARTITION BY COIN_ID 
                    ORDER BY TIMESTAMP 
                    ROWS BETWEEN 13 PRECEDING AND CURRENT ROW
                ) as EMA_14,
                AVG(PRICE_USD) OVER (
                    PARTITION BY COIN_ID 
                    ORDER BY TIMESTAMP 
                    ROWS BETWEEN 29 PRECEDING AND CURRENT ROW
                ) as EMA_30
            FROM PRICES
        ),
        rsi_calc AS (
            SELECT 
                COIN_ID,
                TIMESTAMP,
                PRICE_USD,
                CASE WHEN (PRICE_USD - PREV_PRICE) > 0 THEN (PRICE_USD - PREV_PRICE) ELSE 0 END as PRICE_UP,
                CASE WHEN (PRICE_USD - PREV_PRICE) < 0 THEN ABS(PRICE_USD - PREV_PRICE) ELSE 0 END as PRICE_DOWN
            FROM price_changes
        ),
        rsi_averages AS (
            SELECT
                COIN_ID,
                TIMESTAMP,
                PRICE_USD,
                AVG(PRICE_UP) OVER (
                    PARTITION BY COIN_ID 
                    ORDER BY TIMESTAMP 
                    ROWS BETWEEN 13 PRECEDING AND CURRENT ROW
                ) as AVG_UP,
                AVG(PRICE_DOWN) OVER (
                    PARTITION BY COIN_ID 
                    ORDER BY TIMESTAMP 
                    ROWS BETWEEN 13 PRECEDING AND CURRENT ROW
                ) as AVG_DOWN
            FROM rsi_calc
        )
        SELECT 
            h.SYMBOL,
            p.COIN_ID,
            p.TIMESTAMP,
            p.PRICE_USD,
            p.EMA_14,
            p.EMA_30,
            CASE 
                WHEN p.EMA_14 > p.EMA_30 THEN 'BULLISH'
                WHEN p.EMA_14 < p.EMA_30 THEN 'BEARISH'
                ELSE 'NEUTRAL'
            END as TREND_SIGNAL,
            100 - (100 / (1 + (r.AVG_UP / NULLIF(r.AVG_DOWN, 0)))) as RSI
        FROM price_changes p
        JOIN rsi_averages r ON p.COIN_ID = r.COIN_ID AND p.TIMESTAMP = r.TIMESTAMP
        JOIN HOLDINGS h ON p.COIN_ID = h.COIN_ID
        WHERE p.TIMESTAMP >= DATEADD(day, -30, CURRENT_TIMESTAMP())
        """)

        # 2. Volatility Analysis
        cur.execute("""
        CREATE OR REPLACE VIEW VOLATILITY_ANALYSIS AS
        WITH daily_stats AS (
            SELECT 
                COIN_ID,
                DATE_TRUNC('day', TIMESTAMP) as DATE,
                MAX(PRICE_USD) as HIGH,
                MIN(PRICE_USD) as LOW,
                FIRST_VALUE(PRICE_USD) OVER (
                    PARTITION BY COIN_ID, DATE_TRUNC('day', TIMESTAMP) 
                    ORDER BY TIMESTAMP ASC
                    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
                ) as OPEN,
                LAST_VALUE(PRICE_USD) OVER (
                    PARTITION BY COIN_ID, DATE_TRUNC('day', TIMESTAMP) 
                    ORDER BY TIMESTAMP ASC
                    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
                ) as CLOSE
            FROM PRICES
            GROUP BY 
                COIN_ID, 
                DATE_TRUNC('day', TIMESTAMP),
                TIMESTAMP,
                PRICE_USD
        ),
        daily_aggregates AS (
            SELECT 
                COIN_ID,
                DATE,
                MAX(HIGH) as HIGH,
                MIN(LOW) as LOW,
                MAX(CASE WHEN OPEN IS NOT NULL THEN OPEN END) as OPEN,
                MAX(CASE WHEN CLOSE IS NOT NULL THEN CLOSE END) as CLOSE
            FROM daily_stats
            GROUP BY COIN_ID, DATE
        )
        SELECT 
            h.SYMBOL,
            d.COIN_ID,
            d.DATE,
            d.HIGH,
            d.LOW,
            d.OPEN,
            d.CLOSE,
            ((d.HIGH - d.LOW) / NULLIF(d.LOW, 0)) * 100 as DAILY_VOLATILITY,
            ((d.CLOSE - d.OPEN) / NULLIF(d.OPEN, 0)) * 100 as DAILY_RETURN,
            AVG(((d.HIGH - d.LOW) / NULLIF(d.LOW, 0)) * 100) OVER (
                PARTITION BY d.COIN_ID 
                ORDER BY d.DATE 
                ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
            ) as WEEKLY_AVG_VOLATILITY
        FROM daily_aggregates d
        JOIN HOLDINGS h ON d.COIN_ID = h.COIN_ID
        WHERE d.DATE >= DATEADD(month, -1, CURRENT_DATE())
        """)

        # 3. Price Momentum and Trend Analysis
        cur.execute("""
        CREATE OR REPLACE VIEW PRICE_MOMENTUM AS
        WITH price_history AS (
            SELECT 
                COIN_ID,
                TIMESTAMP,
                PRICE_USD,
                LAG(PRICE_USD, 1) OVER (PARTITION BY COIN_ID ORDER BY TIMESTAMP) as PRICE_1D_AGO,
                LAG(PRICE_USD, 7) OVER (PARTITION BY COIN_ID ORDER BY TIMESTAMP) as PRICE_7D_AGO,
                LAG(PRICE_USD, 30) OVER (PARTITION BY COIN_ID ORDER BY TIMESTAMP) as PRICE_30D_AGO
            FROM PRICES
            WHERE TIMESTAMP >= DATEADD(day, -31, CURRENT_TIMESTAMP())
        ),
        momentum_calc AS (
            SELECT 
                COIN_ID,
                TIMESTAMP,
                PRICE_USD,
                PRICE_1D_AGO,
                PRICE_7D_AGO,
                PRICE_30D_AGO,
                CASE 
                    WHEN PRICE_1D_AGO IS NOT NULL AND PRICE_1D_AGO != 0 
                    THEN ((PRICE_USD - PRICE_1D_AGO) / PRICE_1D_AGO) * 100 
                    ELSE 0 
                END as MOMENTUM_1D,
                CASE 
                    WHEN PRICE_7D_AGO IS NOT NULL AND PRICE_7D_AGO != 0 
                    THEN ((PRICE_USD - PRICE_7D_AGO) / PRICE_7D_AGO) * 100 
                    ELSE 0 
                END as MOMENTUM_7D,
                CASE 
                    WHEN PRICE_30D_AGO IS NOT NULL AND PRICE_30D_AGO != 0 
                    THEN ((PRICE_USD - PRICE_30D_AGO) / PRICE_30D_AGO) * 100 
                    ELSE 0 
                END as MOMENTUM_30D
            FROM price_history
        )
        SELECT 
            h.SYMBOL,
            p.COIN_ID,
            p.TIMESTAMP,
            p.PRICE_USD,
            COALESCE(p.MOMENTUM_1D, 0) as MOMENTUM_1D,
            COALESCE(p.MOMENTUM_7D, 0) as MOMENTUM_7D,
            COALESCE(p.MOMENTUM_30D, 0) as MOMENTUM_30D,
            CASE 
                WHEN p.PRICE_USD > p.PRICE_7D_AGO AND p.PRICE_7D_AGO > p.PRICE_30D_AGO THEN 'STRONG_UPTREND'
                WHEN p.PRICE_USD > p.PRICE_7D_AGO THEN 'UPTREND'
                WHEN p.PRICE_USD < p.PRICE_7D_AGO AND p.PRICE_7D_AGO < p.PRICE_30D_AGO THEN 'STRONG_DOWNTREND'
                WHEN p.PRICE_USD < p.PRICE_7D_AGO THEN 'DOWNTREND'
                ELSE 'SIDEWAYS'
            END as TREND_DIRECTION
        FROM momentum_calc p
        JOIN HOLDINGS h ON p.COIN_ID = h.COIN_ID
        WHERE p.TIMESTAMP >= DATEADD(day, -30, CURRENT_TIMESTAMP())
        ORDER BY p.TIMESTAMP DESC
        """)

        # 4. Portfolio Risk Analysis
        cur.execute("""
        CREATE OR REPLACE VIEW PORTFOLIO_RISK_ANALYSIS AS
        WITH daily_returns AS (
            SELECT 
                h.CATEGORY,
                h.COIN_ID,
                DATE_TRUNC('day', p.TIMESTAMP) as DATE,
                h.AMOUNT,
                p.PRICE_USD,
                h.AMOUNT * p.PRICE_USD as POSITION_VALUE,
                ((p.PRICE_USD - LAG(p.PRICE_USD) OVER (
                    PARTITION BY h.COIN_ID 
                    ORDER BY p.TIMESTAMP
                )) / NULLIF(LAG(p.PRICE_USD) OVER (
                    PARTITION BY h.COIN_ID 
                    ORDER BY p.TIMESTAMP
                ), 0)) * 100 as DAILY_RETURN
            FROM HOLDINGS h
            JOIN PRICES p ON h.COIN_ID = p.COIN_ID
            WHERE p.TIMESTAMP >= DATEADD(month, -1, CURRENT_TIMESTAMP())
        ),
        volatility_calc AS (
            SELECT 
                CATEGORY,
                DATE,
                SUM(POSITION_VALUE) as TOTAL_VALUE,
                AVG(DAILY_RETURN) as AVG_DAILY_RETURN,
                STDDEV(DAILY_RETURN) as DAILY_VOLATILITY,
                COUNT(DISTINCT COIN_ID) as NUM_ASSETS
            FROM daily_returns
            GROUP BY CATEGORY, DATE
        )
        SELECT 
            v.CATEGORY,
            v.DATE,
            v.TOTAL_VALUE,
            v.AVG_DAILY_RETURN,
            v.DAILY_VOLATILITY,
            v.AVG_DAILY_RETURN / NULLIF(v.DAILY_VOLATILITY, 0) as SHARPE_RATIO,
            v.NUM_ASSETS,
            CASE 
                WHEN v.DAILY_VOLATILITY > 5 THEN 'HIGH_RISK'
                WHEN v.DAILY_VOLATILITY > 2 THEN 'MEDIUM_RISK'
                ELSE 'LOW_RISK'
            END as RISK_CATEGORY,
            MAX(v.AVG_DAILY_RETURN) OVER (
                PARTITION BY v.CATEGORY 
                ORDER BY v.DATE 
                ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
            ) as MAX_7D_RETURN,
            MIN(v.AVG_DAILY_RETURN) OVER (
                PARTITION BY v.CATEGORY 
                ORDER BY v.DATE 
                ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
            ) as MIN_7D_RETURN,
            v.AVG_DAILY_RETURN - (v.DAILY_VOLATILITY * 1.645) as VAR_95,
            MIN(v.AVG_DAILY_RETURN) OVER (
                PARTITION BY v.CATEGORY 
                ORDER BY v.DATE 
                ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
            ) as MAX_DRAWDOWN
        FROM volatility_calc v
        WHERE v.DATE >= DATEADD(day, -30, CURRENT_DATE())
        ORDER BY v.DATE DESC, v.TOTAL_VALUE DESC
        """)

    except Exception as e:
        print(f"❌ Error setting up analytics: {str(e)}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    setup_analytics() 