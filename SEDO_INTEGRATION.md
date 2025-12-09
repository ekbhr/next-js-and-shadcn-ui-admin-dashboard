# Sedo Integration Guide

## Overview

This document describes the Sedo.com integration for the reporting dashboard. The integration is designed to fetch revenue and analytics data from Sedo and display it in the dashboard.

## API Endpoints

All endpoints follow the **Pull → Process → Save** workflow:
1. **Pull**: Fetch raw data from Sedo API
2. **Process**: Transform and validate data
3. **Save**: (Future) Store processed data in database

### 1. Revenue Data
**GET** `/api/reports/sedo/revenue`

Fetch daily revenue data from Sedo, process it, and optionally save to database.

**Query Parameters:**
- `startDate` (optional): Start date in YYYY-MM-DD format (defaults to 30 days ago)
- `endDate` (optional): End date in YYYY-MM-DD format (defaults to today)
- `domain` (optional): Filter by specific domain
- `revshare` (optional): Revshare percentage 0-100 (for calculating net revenue)
- `save` (optional): Set to "true" to save processed data to database (defaults to false)

**Example:**
```
GET /api/reports/sedo/revenue?startDate=2024-01-01&endDate=2024-01-31&revshare=20
```

**Response:**
```json
{
  "success": true,
  "raw": {
    "success": true,
    "data": [
      {
        "date": "2024-01-01",
        "revenue": 125.50,
        "clicks": 450,
        "impressions": 5000,
        "ctr": 9.0,
        "rpm": 25.10
      }
    ],
    "totalRevenue": 3750.00,
    "totalClicks": 13500,
    "totalImpressions": 150000,
    "dateRange": {
      "start": "2024-01-01",
      "end": "2024-01-31"
    }
  },
  "processed": [
    {
      "date": "2024-01-01T00:00:00.000Z",
      "network": "sedo",
      "grossRevenue": 125.50,
      "netRevenue": 100.40,
      "revshare": 20,
      "clicks": 450,
      "impressions": 5000,
      "ctr": 9.0,
      "rpm": 25.10,
      "source": "api",
      "processedAt": "2024-01-31T12:00:00.000Z"
    }
  ],
  "metadata": {
    "totalRevenue": 3750.00,
    "totalClicks": 13500,
    "totalImpressions": 150000,
    "dateRange": {
      "start": "2024-01-01",
      "end": "2024-01-31"
    }
  },
  "validation": {
    "total": 31,
    "valid": 31,
    "invalid": 0,
    "errors": []
  },
  "saved": false
}
```

---

### 2. Geographic Breakdown
**GET** `/api/reports/sedo/geo`

Fetch revenue data broken down by geographic location, process it, and optionally save to database.

**Query Parameters:**
- `startDate` (optional): Start date in YYYY-MM-DD format
- `endDate` (optional): End date in YYYY-MM-DD format
- `domain` (optional): Filter by specific domain
- `revshare` (optional): Revshare percentage 0-100
- `save` (optional): Set to "true" to save to database (defaults to false)

**Example:**
```
GET /api/reports/sedo/geo?startDate=2024-01-01&endDate=2024-01-31
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "date": "2024-01-31",
      "geo": "US",
      "revenue": 450.25,
      "clicks": 1200,
      "impressions": 12000
    },
    {
      "date": "2024-01-31",
      "geo": "GB",
      "revenue": 320.50,
      "clicks": 850,
      "impressions": 8500
    }
  ],
  "totalRevenue": 3750.00,
  "totalClicks": 13500,
  "totalImpressions": 150000
}
```

---

### 3. Device Breakdown
**GET** `/api/reports/sedo/device`

Fetch revenue data broken down by device type (desktop, mobile, tablet), process it, and optionally save to database.

**Query Parameters:**
- `startDate` (optional): Start date in YYYY-MM-DD format
- `endDate` (optional): End date in YYYY-MM-DD format
- `domain` (optional): Filter by specific domain
- `revshare` (optional): Revshare percentage 0-100
- `save` (optional): Set to "true" to save to database (defaults to false)

**Example:**
```
GET /api/reports/sedo/device?startDate=2024-01-01&endDate=2024-01-31
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "date": "2024-01-31",
      "device": "desktop",
      "revenue": 800.00,
      "clicks": 2000,
      "impressions": 20000
    },
    {
      "date": "2024-01-31",
      "device": "mobile",
      "revenue": 600.50,
      "clicks": 1500,
      "impressions": 15000
    }
  ],
  "totalRevenue": 3750.00,
  "totalClicks": 13500,
  "totalImpressions": 150000
}
```

---

### 4. Summary/Overview
**GET** `/api/reports/sedo/summary`

Fetch aggregated summary metrics from processed data.

**Query Parameters:**
- `startDate` (optional): Start date in YYYY-MM-DD format (defaults to 30 days ago)
- `endDate` (optional): End date in YYYY-MM-DD format (defaults to today)
- `domain` (optional): Filter by specific domain
- `revshare` (optional): Revshare percentage 0-100 (for calculating net revenue)
- `source` (optional): "api" or "database" (defaults to "api")

**Example:**
```
GET /api/reports/sedo/summary?startDate=2024-01-01&endDate=2024-01-31
```

**Response:**
```json
{
  "success": true,
  "summary": {
    "totalRevenue": 3750.00,
    "totalClicks": 13500,
    "totalImpressions": 150000,
    "avgDailyRevenue": 120.97,
    "avgCTR": 9.0,
    "avgRPM": 25.00,
    "revenueChange": 375.00,
    "revenueChangePercent": 10.0,
    "period": {
      "start": "2024-01-01",
      "end": "2024-01-31",
      "days": 31
    }
  }
}
```

---

## Configuration

### Environment Variables

Add to `.env.local`:

```env
# Sedo API Configuration
# Required: Obtain from Sedo Partner Program (https://sedo.com/member/partner/integration.php)
SEDO_SIGN_KEY=your_sedo_sign_key_here  # API authentication key
SEDO_PARTNER_ID=your_partner_id_here   # Partner account identifier
SEDO_API_URL=https://api.sedo.com      # Optional, defaults to this

# Note: SEDO_API_KEY is also supported for backward compatibility
```

### Current Status

- ✅ API endpoints created
- ✅ Service layer with mock data support
- ⏳ Waiting for Sedo API credentials and documentation
- ⏳ Database models will be added after data structure is clarified

---

## Implementation Details

### Service Layer

**Sedo Client** (`src/lib/sedo.ts`):
- **SedoClient**: Main client class for Sedo API interactions
- **getRevenueData()**: Fetches daily revenue data
- **getRevenueByGeo()**: Fetches revenue by geographic location
- **getRevenueByDevice()**: Fetches revenue by device type
- **Mock Data**: Returns mock data when API key is not configured (for development)

**Data Processor** (`src/lib/sedo-processor.ts`):
- **processSedoRevenueData()**: Transforms raw Sedo data into database-ready format
- **processSedoReport()**: Processes entire report responses
- **validateProcessedData()**: Validates individual data items
- **validateBatch()**: Batch validates multiple data items
- Handles revshare calculations (gross → net revenue)
- Adds metadata (network, source, processedAt, userId)

### Data Structure

The current data structure supports:
- Date-based reporting
- Revenue, clicks, impressions
- CTR (Click-Through Rate)
- RPM (Revenue Per Mille)
- Geographic breakdown
- Device breakdown

**Note**: The actual data structure will be finalized once we have:
- Sedo API documentation
- Data column details (user, revshare, gross/net revenue, etc.)
- Ad network identification requirements

---

## Testing

### Test with Mock Data (No API Key)

1. Don't set `SEDO_API_KEY` in `.env.local`
2. The endpoints will return mock data automatically
3. Test all endpoints:
   - `/api/reports/sedo/revenue`
   - `/api/reports/sedo/geo`
   - `/api/reports/sedo/device`
   - `/api/reports/sedo/summary`

### Test with Real API (When Available)

1. Add `SEDO_API_KEY` to `.env.local`
2. Update `src/lib/sedo.ts` with actual API implementation
3. Test endpoints with real data

---

## Next Steps

1. **Get Sedo API credentials** - Obtain API key and documentation
2. **Implement actual API calls** - Replace mock data with real API calls
3. **Define data models** - Once data structure is clear, add Prisma models
4. **Add database storage** - Store fetched data for historical tracking
5. **Update dashboard** - Connect dashboard components to these APIs
6. **Add other networks** - Extend structure for Yandex, Google Ad Manager, etc.

---

## File Structure

```
src/
├── lib/
│   ├── sedo.ts                    # Sedo client service (pulls data)
│   └── sedo-processor.ts          # Data processor (transforms & validates)
└── app/
    └── api/
        └── reports/
            └── sedo/
                ├── revenue/
                │   └── route.ts   # Revenue endpoint (pull → process → save)
                ├── geo/
                │   └── route.ts   # Geographic breakdown
                ├── device/
                │   └── route.ts   # Device breakdown
                └── summary/
                    └── route.ts   # Summary/overview
```

## Data Processing Workflow

### 1. Pull (Sedo Client)
- Fetches raw data from Sedo API
- Returns `SedoReportResponse` with raw data

### 2. Process (Data Processor)
- Transforms raw data into `ProcessedSedoData` format
- Calculates net revenue from gross revenue and revshare
- Adds metadata (network, source, processedAt)
- Validates data integrity

### 3. Save (Future - Database)
- Stores processed data in Prisma models
- Will be implemented once data structure is finalized
- Supports deduplication and batch operations

