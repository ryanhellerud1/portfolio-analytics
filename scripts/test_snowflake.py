import snowflake.connector
import os
from dotenv import load_dotenv
from pathlib import Path

def debug_env():
    project_root = Path(__file__).parent.parent
    env_path = project_root / '.env'
    
    print(f"Looking for .env file at: {env_path}")
    print(f"File exists: {env_path.exists()}")
    
    load_dotenv(env_path)
    
    print("\nEnvironment Variables:")
    print(f"SNOWFLAKE_ACCOUNT: {os.getenv('SNOWFLAKE_ACCOUNT')}")
    print(f"SNOWFLAKE_REGION: {os.getenv('SNOWFLAKE_REGION')}")
    print(f"SNOWFLAKE_USERNAME: {os.getenv('SNOWFLAKE_USERNAME')}")
    print(f"SNOWFLAKE_PASSWORD: {'*' * 8 if os.getenv('SNOWFLAKE_PASSWORD') else 'Not Set'}")
    print(f"SNOWFLAKE_WAREHOUSE: {os.getenv('SNOWFLAKE_WAREHOUSE')}")
    print(f"SNOWFLAKE_DATABASE: {os.getenv('SNOWFLAKE_DATABASE')}")
    print(f"SNOWFLAKE_SCHEMA: {os.getenv('SNOWFLAKE_SCHEMA')}")

def test_connection():
    try:
        debug_env()
        
        # Build connection parameters
        account = os.getenv('SNOWFLAKE_ACCOUNT')
        region = os.getenv('SNOWFLAKE_REGION')
        
        # Format the account identifier correctly
        account_identifier = f"{account}.{region}"
        print(f"\nTrying to connect with account identifier: {account_identifier}")
        
        # Connect with insecure mode for testing
        conn = snowflake.connector.connect(
            user=os.getenv('SNOWFLAKE_USERNAME'),
            password=os.getenv('SNOWFLAKE_PASSWORD'),
            account=account_identifier,
            warehouse=os.getenv('SNOWFLAKE_WAREHOUSE'),
            database=os.getenv('SNOWFLAKE_DATABASE'),
            schema=os.getenv('SNOWFLAKE_SCHEMA'),
            insecure_mode=True,  # Disable SSL verification for testing
            client_session_keep_alive=True,
            login_timeout=30,
            network_timeout=30
        )

        # Test basic queries
        print("Testing connection...")
        
        cur = conn.cursor()
        
        # Test 1: Get version
        cur.execute("SELECT CURRENT_VERSION()")
        version = cur.fetchone()[0]
        print(f"Snowflake Version: {version}")

        # Test 2: Check current context
        cur.execute("SELECT CURRENT_DATABASE(), CURRENT_SCHEMA(), CURRENT_WAREHOUSE()")
        context = cur.fetchone()
        print(f"Current Context - Database: {context[0]}, Schema: {context[1]}, Warehouse: {context[2]}")

        print("\nConnection test successful! ✅")

    except Exception as e:
        print(f"\n❌ Connection failed with error:\n{str(e)}")
        raise
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    test_connection() 