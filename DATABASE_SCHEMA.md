# Database Schema Documentation

**Project**: reporting.revengine.media (RevEngine Reporting Dashboard)  
**Database**: PostgreSQL (Supabase)  
**ORM**: Prisma 7  
**Last Updated**: December 2025

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Tables](#tables)
   - [User Management](#user-management)
   - [Revenue Data](#revenue-data)
   - [Configuration](#configuration)
4. [Data Flow](#data-flow)
5. [RevShare Logic](#revshare-logic)
6. [Sync Strategy](#sync-strategy)

---

## Overview

This database supports a multi-network ad revenue reporting dashboard. It stores revenue data from multiple ad networks (Sedo, Yandex, Google, etc.) and provides unified reporting with configurable revenue sharing.

### Key Features

- **Multi-user support**: Each user has their own data
- **Multi-network**: Separate tables per ad network with aggregated overview
- **Flexible RevShare**: Per domain, per network, or default settings
- **Data integrity**: Upsert logic ensures accurate historical data

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      DATA SOURCES                           │
├─────────────┬─────────────┬─────────────┬──────────────────┤
│  Sedo API   │ Yandex API  │ Google API  │  (Future APIs)   │
└──────┬──────┴──────┬──────┴──────┬──────┴────────┬─────────┘
       │             │             │               │
       ▼             ▼             ▼               ▼
┌─────────────┬─────────────┬─────────────┬──────────────────┐
│ Bidder_Sedo │Bidder_Yandex│Bidder_Google│  Bidder_[Name]   │
│  (specific) │  (specific) │  (specific) │    (specific)    │
└──────┬──────┴──────┬──────┴──────┬──────┴────────┬─────────┘
       │             │             │               │
       └─────────────┴──────┬──────┴───────────────┘
                            │
                            ▼
                  ┌──────────────────┐
                  │ Overview_Report  │
                  │   (aggregated)   │
                  └────────┬─────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  Dashboard  │
                    └─────────────┘
```

---

## Tables

### User Management

#### `User`

Core user table for authentication (NextAuth.js).

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | String | No | Primary key (CUID) |
| name | String | Yes | Display name |
| email | String | No | Unique email address |
| emailVerified | DateTime | Yes | Email verification timestamp |
| password | String | Yes | Hashed password (bcrypt) |
| image | String | Yes | Profile image URL |
| createdAt | DateTime | No | Account creation date |
| updatedAt | DateTime | No | Last update timestamp |

**Relations**: Account[], Session[], PasswordResetToken[], Bidder_Sedo[], Domain_Assignment[], Overview_Report[]

---

#### `Account`

OAuth provider accounts (for social login).

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | String | No | Primary key |
| userId | String | No | Foreign key to User |
| type | String | No | Account type |
| provider | String | No | OAuth provider name |
| providerAccountId | String | No | Provider's account ID |
| refresh_token | String | Yes | OAuth refresh token |
| access_token | String | Yes | OAuth access token |
| expires_at | Int | Yes | Token expiration |
| token_type | String | Yes | Token type |
| scope | String | Yes | OAuth scope |
| id_token | String | Yes | ID token |
| session_state | String | Yes | Session state |

**Unique**: [provider, providerAccountId]

---

#### `Session`

User sessions for authentication.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | String | No | Primary key |
| sessionToken | String | No | Unique session token |
| userId | String | No | Foreign key to User |
| expires | DateTime | No | Session expiration |

---

#### `PasswordResetToken`

Tokens for password reset flow.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | String | No | Primary key |
| token | String | No | Unique reset token |
| userId | String | No | Foreign key to User |
| expires | DateTime | No | Token expiration |
| createdAt | DateTime | No | Creation timestamp |

**Indexes**: [token], [userId]

---

### Revenue Data

#### `Bidder_Sedo`

Sedo-specific revenue data with SubID support.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | String | No | cuid() | Primary key |
| date | DateTime | No | - | Reporting date |
| domain | String | Yes | - | Domain name |
| c1 | String | Yes | - | Sedo Sub ID 1 |
| c2 | String | Yes | - | Sedo Sub ID 2 |
| c3 | String | Yes | - | Sedo Sub ID 3 |
| grossRevenue | Float | No | - | Total earnings from Sedo |
| netRevenue | Float | No | - | After revshare deduction |
| revShare | Float | No | 80 | Partner's percentage |
| currency | String | No | "EUR" | Currency code |
| impressions | Int | No | - | Unique visitors |
| clicks | Int | No | - | Click count |
| ctr | Float | Yes | - | Click-through rate (%) |
| rpm | Float | Yes | - | Revenue per mille |
| status | String | Yes | - | "Final" or "Estimated" |
| tag | String | Yes | - | Custom tag/label |
| createdAt | DateTime | No | now() | Record creation |
| updatedAt | DateTime | No | auto | Last update |
| userId | String | No | - | Foreign key to User |

**Unique**: [date, domain, c1, c2, c3, userId]  
**Indexes**: [date], [userId], [domain]

**SubID Fields Explained**:
- `c1`: Primary tracking ID (e.g., user assignment)
- `c2`: Secondary tracking (e.g., campaign)
- `c3`: Tertiary tracking (e.g., source)

---

#### `Bidder_Yandex` (Future)

Yandex-specific revenue data.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | String | No | Primary key |
| date | DateTime | No | Reporting date |
| domain | String | Yes | Domain name |
| grossRevenue | Float | No | Total earnings |
| netRevenue | Float | No | After revshare |
| revShare | Float | No | Partner's percentage |
| currency | String | No | Currency (RUB/USD) |
| impressions | Int | No | Page views |
| clicks | Int | No | Ad clicks |
| *...Yandex-specific fields* | | | |
| userId | String | No | Foreign key to User |

---

#### `Bidder_Google` (Future)

Google Ad Manager specific revenue data.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | String | No | Primary key |
| date | DateTime | No | Reporting date |
| domain | String | Yes | Domain name |
| adUnit | String | Yes | Ad unit ID |
| grossRevenue | Float | No | Total earnings |
| netRevenue | Float | No | After revshare |
| *...Google-specific fields* | | | |
| userId | String | No | Foreign key to User |

---

#### `Overview_Report`

Aggregated data from all ad networks for dashboard display.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | String | No | cuid() | Primary key |
| date | DateTime | No | - | Reporting date |
| network | String | No | - | Network name ("sedo", "yandex", "google") |
| domain | String | Yes | - | Domain name |
| grossRevenue | Float | No | - | Total earnings |
| netRevenue | Float | No | - | After revshare |
| currency | String | No | "EUR" | Currency code |
| impressions | Int | No | - | Total impressions |
| clicks | Int | No | - | Total clicks |
| ctr | Float | Yes | - | Click-through rate |
| rpm | Float | Yes | - | Revenue per mille |
| createdAt | DateTime | No | now() | Record creation |
| updatedAt | DateTime | No | auto | Last update |
| userId | String | No | - | Foreign key to User |

**Unique**: [date, network, domain, userId]  
**Indexes**: [date], [network], [userId]

---

### Configuration

#### `Domain_Assignment`

Configures domain ownership and revshare settings per user.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | String | No | cuid() | Primary key |
| userId | String | No | - | Foreign key to User |
| domain | String | Yes | - | Domain (null = all domains) |
| network | String | Yes | - | Network (null = all networks) |
| revShare | Float | No | - | Partner's percentage (0-100) |
| isActive | Boolean | No | true | Is assignment active |
| notes | String | Yes | - | Admin notes |
| createdAt | DateTime | No | now() | Record creation |
| updatedAt | DateTime | No | auto | Last update |

**Unique**: [userId, domain, network]  
**Indexes**: [userId], [domain], [network]

---

## Data Flow

### 1. Fetching Data

```
API Request → Sedo API → Parse XML → Transform Data → Calculate RevShare → Upsert to Bidder_Sedo
```

### 2. RevShare Calculation

```typescript
// On data save:
grossRevenue = earnings from API
revShare = getRevShare(userId, domain, network) // From Domain_Assignment
netRevenue = grossRevenue * (revShare / 100)
```

### 3. Overview Aggregation

```
Bidder_Sedo    ─┐
Bidder_Yandex  ─┼─► Aggregate common fields ─► Overview_Report
Bidder_Google  ─┘
```

---

## RevShare Logic

### Priority Order (Most Specific Wins)

1. **Exact match**: `domain + network + userId` → Use that revShare
2. **Network default**: `null domain + network + userId` → Default for that network
3. **User default**: `null domain + null network + userId` → User's fallback
4. **System default**: `80%` → Global fallback

### Example Lookup

```typescript
function getRevShare(userId: string, domain: string, network: string): number {
  // 1. Exact match
  let setting = db.domain_Assignment.findFirst({
    where: { userId, domain, network }
  });
  if (setting) return setting.revShare;
  
  // 2. Network default
  setting = db.domain_Assignment.findFirst({
    where: { userId, domain: null, network }
  });
  if (setting) return setting.revShare;
  
  // 3. User default
  setting = db.domain_Assignment.findFirst({
    where: { userId, domain: null, network: null }
  });
  if (setting) return setting.revShare;
  
  // 4. System default
  return 80;
}
```

### Example Data

| userId | domain | network | revShare | Applied When |
|--------|--------|---------|----------|--------------|
| user1 | example.com | sedo | 80 | example.com on Sedo |
| user1 | example.com | yandex | 70 | example.com on Yandex |
| user1 | null | google | 90 | Any domain on Google |
| user1 | null | null | 75 | Fallback for user1 |

---

## Sync Strategy

### Daily Cron Job

```
Schedule: Daily at 4:00 AM (after Sedo finalizes data)
Range: Last 31 days
Logic: Upsert (Update if exists, Insert if new)
```

### Why 31 Days?

1. **Estimated → Final**: Data becomes final after 48 hours
2. **Spam Deductions**: Applied at month end
3. **Data Corrections**: Ad networks may adjust historical data

### Upsert Logic

```typescript
// Pseudo-code
for each day in range:
  data = fetchFromAPI(day)
  
  existingRecord = db.findUnique({
    date, domain, c1, c2, c3, userId
  })
  
  if (existingRecord):
    db.update(existingRecord.id, newData)  // Update
  else:
    db.create(newData)  // Insert
```

---

## Indexes Strategy

| Table | Index | Purpose |
|-------|-------|---------|
| Bidder_Sedo | [date] | Date-range queries |
| Bidder_Sedo | [userId] | User filtering |
| Bidder_Sedo | [domain] | Domain filtering |
| Overview_Report | [date, network] | Dashboard queries |
| Domain_Assignment | [userId, domain, network] | RevShare lookup |

---

## Future Considerations

### Planned Tables

- `Bidder_Yandex` - Yandex ad network data
- `Bidder_Google` - Google Ad Manager data
- `Bidder_[Network]` - Additional ad networks

### Potential Enhancements

- `Audit_Log` - Track data changes
- `Sync_History` - Track API sync runs
- `User_Settings` - User preferences
- `Currency_Rates` - For multi-currency support

---

## Quick Reference

### Common Queries

```sql
-- Get user's total revenue for date range
SELECT SUM(netRevenue) 
FROM "Overview_Report" 
WHERE userId = 'xxx' AND date BETWEEN '2025-01-01' AND '2025-01-31';

-- Get top domains by revenue
SELECT domain, SUM(grossRevenue) as total
FROM "Bidder_Sedo"
WHERE userId = 'xxx'
GROUP BY domain
ORDER BY total DESC;

-- Get revShare for specific domain/network
SELECT revShare 
FROM "Domain_Assignment"
WHERE userId = 'xxx' AND domain = 'example.com' AND network = 'sedo';
```

---

**Document Version**: 1.0  
**Created**: December 2025  
**Author**: AI Assistant  
**Project**: RevEngine Reporting Dashboard (reporting.revengine.media)

