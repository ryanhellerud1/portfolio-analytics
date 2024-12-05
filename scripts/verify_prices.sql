-- Add this query to verify the data
SELECT 
    COIN_ID,
    PRICE_USD,
    PRICE_CHANGE_24H_PCT,
    TIMESTAMP
FROM PRICES
ORDER BY TIMESTAMP DESC
LIMIT 10; 