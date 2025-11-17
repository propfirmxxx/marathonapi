# Participant Analysis Endpoint

## Overview
This is a **professional-grade** endpoint that provides comprehensive analysis for each marathon participant with **advanced filtering and customization options**. You can request only the data you need, filter trades, aggregate history, and much more.

## Endpoint Details

**URL:** `GET /marathons/:marathonId/participants/:participantId/analysis`

**Authentication:** Optional (Public endpoint)

**Path Parameters:**
- `marathonId` (required): Marathon UUID
- `participantId` (required): Participant UUID

## Query Parameters (All Optional)

### Date Range Filters
- `from`: Start date for analysis (ISO string, e.g., `2024-01-01T00:00:00Z`)
- `to`: End date for analysis (ISO string, e.g., `2024-12-31T23:59:59Z`)

### Section Selection 🎯
**Filter which sections to include in the response:**
- `sections`: Comma-separated list of sections to include
  - Available sections:
    - `performance` - Performance metrics and winrate
    - `drawdown` - Drawdown metrics
    - `floatingRisk` - Current floating risk
    - `equityBalanceHistory` - Historical equity and balance data
    - `statsPerSymbol` - Statistics per trading symbol
    - `tradeHistory` - Complete trade history
    - `openPositions` - Current open positions
    - `openOrders` - Pending orders
  - **Example:** `?sections=performance,tradeHistory`
  - **Default:** All sections included if not specified

### Trade History Filters 📊
- `tradeHistoryLimit`: Maximum number of trades (1-1000, default: unlimited)
- `tradeHistorySortBy`: Sort order for trades
  - `openTime_desc` - Latest trades first (default)
  - `openTime_asc` - Oldest trades first
  - `closeTime_desc` - Latest closed first
  - `closeTime_asc` - Oldest closed first
  - `profit_desc` - Most profitable first
  - `profit_asc` - Least profitable first
- `tradeSymbols`: Filter by specific symbols (comma-separated, e.g., `EURUSD,GBPUSD`)
- `onlyProfitableTrades`: Include only winning trades (boolean)
- `onlyLosingTrades`: Include only losing trades (boolean)
- `minProfit`: Minimum profit threshold (number)
- `maxProfit`: Maximum profit threshold (number)

### History Aggregation 📈
- `historyLimit`: Maximum history points to return (1-10000)
- `historyResolution`: Aggregate history data
  - `raw` - No aggregation (default)
  - `hourly` - Aggregate by hour
  - `daily` - Aggregate by day
  - `weekly` - Aggregate by week

### Symbol Statistics Filters
- `topSymbolsLimit`: Maximum number of symbols to return (1-100)

### Position Details
- `includeDetailedPositions`: Include detailed position information (boolean)

## Response Structure

The endpoint returns a comprehensive `ParticipantAnalysisDto` with the following sections:

### 1. Basic Information
```json
{
  "participantId": "uuid",
  "userId": "uuid",
  "userName": "John Doe",
  "accountLogin": "12345678"
}
```

### 2. Performance Metrics (winrate & performance)
```json
{
  "performance": {
    "winrate": 65.5,
    "totalNetProfit": 1500.50,
    "grossProfit": 2500.00,
    "grossLoss": -999.50,
    "profitFactor": 2.50,
    "expectedPayoff": 33.34,
    "sharpeRatio": 1.25,
    "recoveryFactor": 7.5
  }
}
```

### 3. Drawdown Metrics
```json
{
  "drawdown": {
    "balanceDrawdownAbsolute": 200.00,
    "balanceDrawdownMaximal": 500.00,
    "balanceDrawdownRelativePercent": 5.0
  }
}
```

### 4. Floating Risk (ریسک شناور)
```json
{
  "floatingRisk": {
    "floatingPnL": 150.50,
    "floatingRiskPercent": 1.5,
    "openPositionsCount": 3,
    "totalOpenVolume": 0.5
  }
}
```

### 5. Equity and Balance History
```json
{
  "equityBalanceHistory": [
    {
      "timestamp": "2024-01-01T12:00:00Z",
      "balance": 11500.50,
      "equity": 11600.75
    }
  ]
}
```

### 6. Stats Per Symbol
```json
{
  "statsPerSymbol": [
    {
      "symbol": "EURUSD",
      "totalTrades": 15,
      "winTrades": 10,
      "lossTrades": 5,
      "winrate": 66.67,
      "profit": 500.50,
      "averageProfit": 33.37
    }
  ]
}
```

### 7. Total Trades and Win/Loss Trades
```json
{
  "totalTrades": 45,
  "winTrades": 30,
  "lossTrades": 15
}
```

### 8. Trade History
```json
{
  "tradeHistory": [
    {
      "positionId": 12345,
      "orderTicket": 67890,
      "type": "BUY",
      "symbol": "EURUSD",
      "volume": 0.1,
      "openPrice": 1.0850,
      "closePrice": 1.0900,
      "openTime": "2024-01-01T12:00:00Z",
      "closeTime": "2024-01-01T14:00:00Z",
      "profit": 50.00,
      "commission": -2.50,
      "swap": -0.50,
      "stopLoss": 1.0800,
      "takeProfit": 1.0950
    }
  ]
}
```

### 9. Open Positions and Orders
```json
{
  "openPositions": [...],
  "openOrders": [...],
  "currentBalance": 11500.50,
  "currentEquity": 11650.75
}
```

## Example Requests

### 1. Get Complete Analysis (All Data)
```bash
curl -X GET "http://localhost:3000/marathons/marathon-uuid/participants/participant-uuid/analysis"
```

### 2. Get Only Performance and Trade History
```bash
curl -X GET "http://localhost:3000/marathons/marathon-uuid/participants/participant-uuid/analysis?sections=performance,tradeHistory"
```

### 3. Get Top 10 Most Profitable Trades
```bash
curl -X GET "http://localhost:3000/marathons/marathon-uuid/participants/participant-uuid/analysis?sections=tradeHistory&tradeHistoryLimit=10&tradeHistorySortBy=profit_desc"
```

### 4. Get Only Losing Trades
```bash
curl -X GET "http://localhost:3000/marathons/marathon-uuid/participants/participant-uuid/analysis?sections=tradeHistory&onlyLosingTrades=true"
```

### 5. Get EURUSD Trades Only
```bash
curl -X GET "http://localhost:3000/marathons/marathon-uuid/participants/participant-uuid/analysis?sections=tradeHistory,statsPerSymbol&tradeSymbols=EURUSD"
```

### 6. Get Daily Aggregated History (Lightweight)
```bash
curl -X GET "http://localhost:3000/marathons/marathon-uuid/participants/participant-uuid/analysis?sections=equityBalanceHistory&historyResolution=daily"
```

### 7. Get Top 5 Traded Symbols
```bash
curl -X GET "http://localhost:3000/marathons/marathon-uuid/participants/participant-uuid/analysis?sections=statsPerSymbol&topSymbolsLimit=5"
```

### 8. Get Only Performance Metrics (Minimal Response)
```bash
curl -X GET "http://localhost:3000/marathons/marathon-uuid/participants/participant-uuid/analysis?sections=performance,drawdown,floatingRisk"
```

### 9. Get Trades with Profit > $50
```bash
curl -X GET "http://localhost:3000/marathons/marathon-uuid/participants/participant-uuid/analysis?sections=tradeHistory&minProfit=50"
```

### 10. Get Latest 20 Trades for Multiple Symbols
```bash
curl -X GET "http://localhost:3000/marathons/marathon-uuid/participants/participant-uuid/analysis?sections=tradeHistory&tradeSymbols=EURUSD,GBPUSD,USDJPY&tradeHistoryLimit=20&tradeHistorySortBy=openTime_desc"
```

## Features

✅ **Winrate**: Calculated as (profitable trades / total trades) × 100

✅ **Performance Metrics**: 
- Total net profit
- Gross profit/loss
- Profit factor
- Expected payoff
- Sharpe ratio
- Recovery factor

✅ **Float Risk (ریسک شناور)**:
- Current floating P&L
- Floating risk as percentage of equity
- Number of open positions
- Total volume of open positions

✅ **Equity and Balance History**: 
- Time-series data combining balance and equity points
- Useful for charting performance over time

✅ **Drawdown Metrics**:
- Absolute drawdown
- Maximum drawdown
- Relative drawdown percentage

✅ **Stats Per Symbol**:
- Trading performance breakdown by each symbol
- Win rate, profit, and trade count per symbol
- Sorted by total trades (most traded symbols first)

✅ **Total Trades Statistics**:
- Total number of trades
- Number of winning trades
- Number of losing trades

✅ **Trade History**:
- Complete list of all closed trades
- Includes entry/exit prices, P&L, commissions, swaps
- Filtered by date range

✅ **Open Positions and Orders**:
- Current open positions
- Pending orders
- Real-time data from live account data service

## Data Sources

The endpoint aggregates data from multiple sources:
- **TokyoPerformance**: Performance metrics, drawdown data
- **TokyoBalanceHistory**: Historical balance data
- **TokyoEquityHistory**: Historical equity data
- **TokyoTransactionHistory**: Trade history
- **LiveAccountDataService**: Real-time open positions and orders
- **MetaTraderAccount**: Account information

## Use Cases & Best Practices 💡

### Performance Dashboard
**Use Case:** Display overall performance metrics
```
?sections=performance,drawdown,floatingRisk
```
- Lightweight response
- Perfect for dashboard widgets
- Includes all key performance indicators

### Trade Analysis
**Use Case:** Analyze specific trading patterns
```
?sections=tradeHistory,statsPerSymbol&tradeSymbols=EURUSD&tradeHistorySortBy=profit_desc
```
- Focus on specific symbol
- Sort by profitability
- Great for strategy analysis

### Historical Charts
**Use Case:** Display balance/equity charts
```
?sections=equityBalanceHistory&historyResolution=daily&historyLimit=100
```
- Aggregated data for faster loading
- Limited points for better chart performance
- Ideal for time-series visualizations

### Mobile Apps (Bandwidth Optimization)
**Use Case:** Minimize data transfer
```
?sections=performance,openPositions&includeDetailedPositions=false
```
- Only essential data
- Reduced payload size
- Faster response times

### Risk Analysis
**Use Case:** Monitor and analyze trading risk
```
?sections=floatingRisk,openPositions,drawdown
```
- Real-time risk metrics
- Current exposure
- Historical drawdown

### Symbol-Specific Analysis
**Use Case:** Compare performance across symbols
```
?sections=statsPerSymbol&topSymbolsLimit=10
```
- Top traded symbols
- Win rate per symbol
- Profit analysis per symbol

### Winning Trade Study
**Use Case:** Learn from successful trades
```
?sections=tradeHistory&onlyProfitableTrades=true&tradeHistorySortBy=profit_desc&tradeHistoryLimit=50
```
- Only winning trades
- Best trades first
- Study successful patterns

### Loss Prevention Analysis
**Use Case:** Identify losing patterns
```
?sections=tradeHistory&onlyLosingTrades=true&tradeHistorySortBy=profit_asc
```
- Focus on losses
- Worst trades first
- Identify problems

## Performance Optimization Tips 🚀

1. **Request Only What You Need**
   - Use `sections` parameter to filter data
   - Reduces response size by up to 80%
   - Faster API response times

2. **Use History Aggregation**
   - `historyResolution=daily` for long-term analysis
   - `historyResolution=hourly` for recent data
   - Reduces data points significantly

3. **Limit Large Datasets**
   - Use `tradeHistoryLimit` for trade history
   - Use `topSymbolsLimit` for symbol stats
   - Use `historyLimit` for equity/balance history

4. **Smart Filtering**
   - Filter by symbols to reduce data
   - Use profit filters to focus on relevant trades
   - Combine multiple filters for precise data

## Response Size Comparison

| Configuration | Approximate Size | Use Case |
|--------------|------------------|----------|
| All sections (default) | ~500KB - 2MB | Complete analysis |
| Performance only | ~2KB | Dashboard widget |
| Trade history (100 trades) | ~50KB | Recent trades |
| Daily aggregated history | ~10KB | Long-term charts |
| Specific symbol analysis | ~20KB | Symbol focus |

## Notes

- Date range defaults to marathon start/end dates if not provided
- All monetary values are returned with 2 decimal precision
- Statistics per symbol are sorted by total trades (descending)
- Open positions and orders are fetched from real-time data
- The endpoint is public but respects participant privacy (only active participants)
- Filters are applied efficiently at the service layer for optimal performance
- Section filtering reduces database queries significantly

