# Yandex (YAN) Integration Plan

**Created**: December 10, 2025  
**Status**: Planning Complete - Ready to Implement  
**API Documentation**: https://yandex.ru/dev/partner-statistics/doc/en/

---

## Overview

Integration with Yandex Advertising Network (YAN) Partner Statistics API to fetch revenue data for domain monetization reporting.

---

## API Details

| Property | Value |
|----------|-------|
| **API Type** | REST API (HTTPS GET/POST) |
| **Authentication** | OAuth Token |
| **Token Env Variable** | `YANDEX_API` |
| **Base URL** | `https://partner2.yandex.ru/api/statistics/v2/` |
| **Currency** | AED (native support) |

---

## Data Requirements

| Field | YAN API Field | Database Column | Notes |
|-------|--------------|-----------------|-------|
| Date | `date` | `date` | Daily breakdown |
| Domain | `domain` | `domain` | Domain breakdown |
| Tag/AdUnit | `tag_id`, `tag_name` | `tagName`, `tagId` | AdUnit breakdown |
| Impressions | `shows` | `impressions` | |
| Clicks | `clicks` | `clicks` | |
| Revenue | `partner_wo_nds` | `grossRevenue` | Net revenue from Yandex |
| CTR | calculated | `ctr` | clicks/impressions * 100 |
| RPM | calculated | `rpm` | revenue/impressions * 1000 |

---

## Database Schema

Add to `prisma/schema.prisma`:

```prisma
model Bidder_Yandex {
  id            String   @id @default(cuid())
  date          DateTime
  domain        String?
  tagName       String?  // AdUnit name
  tagId         String?  // AdUnit ID
  
  grossRevenue  Float    @default(0)
  netRevenue    Float    @default(0)
  revShare      Float    @default(80)
  impressions   Int      @default(0)
  clicks        Int      @default(0)
  ctr           Float?
  rpm           Float?
  
  currency      String   @default("AED")
  status        String?
  
  userId        String
  user          User     @relation(fields: [userId], references: [id])
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([userId])
  @@index([date])
  @@index([domain])
  @@index([tagId])
}
```

---

## File Structure

```
src/
├── lib/
│   └── yandex.ts                         # Yandex API client
│
├── app/api/
│   ├── reports/yandex/
│   │   └── sync/route.ts                 # Manual sync endpoint
│   └── cron/
│       └── sync-yandex/route.ts          # Daily cron job
│
└── app/(main)/dashboard/admin/reports/
    └── yandex/
        ├── page.tsx                      # Yandex Report page
        └── _components/
            ├── yandex-report-summary.tsx
            ├── yandex-report-table.tsx
            └── sync-yandex-button.tsx
```

---

## API Request Format

Based on YAN Partner Statistics API:

```typescript
// Example API request
const response = await fetch('https://partner2.yandex.ru/api/statistics/v2/get', {
  method: 'POST',
  headers: {
    'Authorization': `OAuth ${process.env.YANDEX_API}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    date_from: '2025-12-01',
    date_to: '2025-12-10',
    dimensions: ['date', 'domain', 'tag_name'],
    metrics: ['shows', 'clicks', 'partner_wo_nds'],
    currency: 'AED',
    lang: 'en',
  }),
});
```

---

## Sync Flow

```
┌──────────────────────────────────────────────────────────────┐
│                     YANDEX SYNC FLOW                          │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  1. Call YAN API with OAuth token                            │
│     POST /api/statistics/v2/get                              │
│     - dimensions: [date, domain, tag_name]                   │
│     - metrics: [shows, clicks, partner_wo_nds]               │
│     - currency: AED                                          │
│     - date_from, date_to (last 31 days)                      │
│                                                               │
│  2. Parse response                                            │
│     - Extract: date, domain, tag, impressions, clicks, rev   │
│                                                               │
│  3. For each record:                                          │
│     - Look up domain owner (Domain_Assignment)               │
│     - Calculate net revenue with revShare                    │
│     - Save to Bidder_Yandex (owner's userId)                 │
│                                                               │
│  4. Sync to Overview_Report                                   │
│     - network: "yandex"                                      │
│     - Aggregate by date + domain + user                      │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## Cron Schedule

Update `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/sync-sedo",
      "schedule": "0 5 * * *"
    },
    {
      "path": "/api/cron/sync-yandex",
      "schedule": "0 6 * * *"
    }
  ]
}
```

| Network | Schedule | UTC | Dubai |
|---------|----------|-----|-------|
| Sedo | `0 5 * * *` | 5:00 AM | 9:00 AM |
| Yandex | `0 6 * * *` | 6:00 AM | 10:00 AM |

---

## Currency Strategy

### Current Plan (Phase 1):
- **Yandex**: Fetch in AED (native support) ✅
- **Sedo**: Keep in EUR (original)
- **Dashboard**: Show currency symbol with values (€ for Sedo, Dh for Yandex)

### Future Plan (Phase 2):
- Unified currency (USD or AED) for all networks
- Currency conversion with configurable exchange rates
- Admin can set preferred display currency

---

## Implementation Checklist

### Database
- [ ] Add `Bidder_Yandex` model to `prisma/schema.prisma`
- [ ] Run `npx prisma migrate dev --name add_yandex_table`
- [ ] Run `npx prisma generate`

### API Client
- [ ] Create `src/lib/yandex.ts` with:
  - [ ] `YandexClient` class
  - [ ] `getRevenueData()` method
  - [ ] `getDomains()` method (if available)
  - [ ] Authentication handling
  - [ ] Error handling
  - [ ] Mock data for development

### Sync Endpoints
- [ ] Create `/api/reports/yandex/sync/route.ts` (manual sync)
- [ ] Create `/api/cron/sync-yandex/route.ts` (cron job)

### Revenue DB Functions
- [ ] Add `saveYandexRevenue()` to `src/lib/revenue-db.ts`
- [ ] Update `syncToOverviewReport()` for Yandex data
- [ ] Add domain ownership lookup for Yandex

### Admin UI
- [ ] Create `/admin/reports/yandex/page.tsx`
- [ ] Create `yandex-report-summary.tsx` component
- [ ] Create `yandex-report-table.tsx` component (TanStack Table)
- [ ] Create `sync-yandex-button.tsx` component
- [ ] Add CSV export for Yandex data

### Sidebar Navigation
- [ ] Update sidebar to show Yandex link (remove "Coming Soon")

### Vercel Config
- [ ] Add Yandex cron job to `vercel.json`
- [ ] Verify `YANDEX_API` env var on Vercel

### Testing
- [ ] Test API connection
- [ ] Test data fetching
- [ ] Test domain ownership mapping
- [ ] Test Overview Report sync
- [ ] Test admin UI

---

## Environment Variables

Required in `.env.local` and Vercel:

```env
YANDEX_API=y0__xDo1pfCCBjnjC0g8fCwzhWayuoipMMblU7cm4Xt-Su4Eabm3Q
```

---

## Notes

1. **Domain Assignment**: Yandex domains need to be assigned to users in Domain Assignment page with `network: "yandex"`

2. **RevShare**: Can have different revShare for Yandex vs Sedo per domain

3. **TagName/AdUnit**: Additional breakdown that Sedo doesn't have - useful for detailed reporting

4. **Data Isolation**: Same logic as Sedo - data saved to domain owner, not logged-in user

---

## References

- [YAN Partner Statistics API Docs](https://yandex.ru/dev/partner-statistics/doc/en/)
- [Accessing the API](https://yandex.ru/dev/partner-statistics/doc/en/dg/access)
- [How to Create a Report](https://yandex.ru/dev/partner-statistics/doc/en/dg/create-report)
- [API Resources](https://yandex.ru/dev/partner-statistics/doc/en/dg/reference/resources)

