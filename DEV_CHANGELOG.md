# Development Changelog

This file tracks all development changes and updates to the RevEngine Reporting Dashboard.

**Domain**: reporting.revengine.media (previously reporting.ekbhr.com)

---

## [Unreleased]

### 2025-12-09 - Critical Security Update & Prisma 7 Migration

#### Security Fix
- **Next.js upgraded from 16.0.3 to 16.0.8** - Critical RCE vulnerability patch
  - CVE-2025-55182 (React2Shell) - Remote Code Execution vulnerability in React Server Components
  - Public exploits are available; immediate upgrade required
  - Also updated `eslint-config-next` to 16.0.8 for compatibility

#### Prisma 7 Migration
- **Added `@prisma/adapter-pg` and `pg` packages** for direct database connections
  - Prisma 7 "client" engine requires either Accelerate URL or database adapter
  - Using pg adapter allows direct PostgreSQL connections without Prisma Accelerate
- **Updated `src/lib/prisma.ts`** to use pg adapter with connection pooling
- **Updated `prisma/schema.prisma`** to use `prisma-client-js` provider with custom output

#### TypeScript Fixes
- **Fixed NextAuth v5 types** in `src/lib/auth.ts`
  - Changed `NextAuthOptions` to `NextAuthConfig`
  - Fixed credentials type casting
- **Fixed dashboard layout** - Added `id` and `role` to user object for AccountSwitcher
- **Fixed dashboard chart** - Type-safe tooltip values with `Number()` wrapper

#### Build Configuration
- **Updated `package.json`** build script: `prisma generate && next build`
- **Added `postinstall` hook** for automatic Prisma client generation

#### Dependencies Added
```json
"@prisma/adapter-pg": "latest",
"pg": "latest"
```

#### Action Required
- Run `npm install` to install new dependencies
- Ensure `DATABASE_URL` or `POSTGRES_URL` is set in environment
- Add all env variables to Vercel for production deployment

---

### 2025-12-04 - Database Schema Documentation

#### Added
- **DATABASE_SCHEMA.md** - Comprehensive database schema documentation
  - Table structures for all models
  - RevShare logic explanation
  - Data flow diagrams
  - Sync strategy documentation
  - Index strategy
  - Quick reference queries

#### Planned (Next Steps)
- `Bidder_Sedo` table implementation
- `Domain_Assignment` table for revshare management
- `Overview_Report` table for aggregated data
- Save functionality in Sedo API

---

### 2025-12-05 - Database & Cron Implementation

#### Added
- **Database Tables** (Prisma migration: `20251205084047_add_revenue_tables`)
  - `Bidder_Sedo` - Sedo-specific revenue data with SubID support
  - `Domain_Assignment` - RevShare configuration per domain/network/user
  - `Overview_Report` - Aggregated data from all ad networks

- **Revenue Database Operations** (`src/lib/revenue-db.ts`)
  - `saveSedoRevenue()` - Upsert Sedo data to database
  - `getRevShare()` - Lookup revShare with priority system
  - `getSedoRevenue()` - Query revenue data
  - `getSedoRevenueSummary()` - Aggregated statistics
  - `setDomainAssignment()` - Configure revShare settings

- **Sync API Endpoint** (`src/app/api/reports/sedo/sync/route.ts`)
  - POST: Fetch from Sedo API and save to database
  - GET: Get summary from database
  - Requires authentication

- **Cron Job** (`src/app/api/cron/sync-sedo/route.ts`)
  - Daily automated sync at 5:00 AM UTC (9:00 AM Dubai)
  - Syncs all users
  - Protected by CRON_SECRET

- **Vercel Configuration** (`vercel.json`)
  - Cron schedule: `0 5 * * *`

#### Environment Variables Required
```env
CRON_SECRET=your-random-secret-here  # For production cron security
```

---

### 2025-12-04 - Sedo API Integration Complete

#### Added
- **Sedo API Implementation** (`src/lib/sedo.ts`)
  - Implemented actual Sedo API calls with Partner ID and SignKey authentication
  - Added multiple endpoint fallback strategy for compatibility
  - Added response transformation from Sedo API format to internal format
  - Added graceful fallback to mock data when API fails
  - Added configuration status helper for debugging

- **Sedo API Test Endpoint** (`src/app/api/reports/sedo/test/route.ts`)
  - New endpoint to test Sedo API connectivity
  - Returns configuration status and sample data
  - Useful for debugging connection issues

#### Changed
- Updated `src/lib/sedo.ts` from mock-only to full API implementation
- Sedo client now uses axios for HTTP requests
- Added TypeScript interfaces for Sedo API response formats

#### Configuration
- Required environment variables for Sedo API:
  - `SEDO_PARTNER_ID` - Partner ID from Sedo (335779)
  - `SEDO_SIGN_KEY` - SignKey from Sedo Partner Program
  - `SEDO_API_URL` - API base URL (defaults to https://api.sedo.com/api/v1)

---

## Previous Changes

### January 2025 - Authentication Phase Complete

#### Completed
- ✅ NextAuth.js v5 authentication setup
- ✅ User registration with email/password
- ✅ User login with credentials
- ✅ JWT-based session management
- ✅ Protected routes middleware
- ✅ Password reset flow (token-based)
- ✅ Resend email integration
- ✅ Logout functionality

#### Files Created
- `src/lib/auth.ts` - NextAuth configuration
- `src/lib/prisma.ts` - Prisma client singleton
- `src/lib/email.ts` - Resend email utility
- `src/lib/email-templates.ts` - Email templates
- `src/middleware.ts` - Route protection
- `src/app/api/auth/register/route.ts` - Registration API
- `src/app/api/auth/forgot-password/route.ts` - Password reset request
- `src/app/api/auth/reset-password/route.ts` - Password reset

### January 2025 - Sedo Integration Foundation

#### Completed
- ✅ Sedo API client structure (`src/lib/sedo.ts`)
- ✅ Data processor utility (`src/lib/sedo-processor.ts`)
- ✅ Revenue endpoint (`/api/reports/sedo/revenue`)
- ✅ Geo breakdown endpoint (`/api/reports/sedo/geo`)
- ✅ Device breakdown endpoint (`/api/reports/sedo/device`)
- ✅ Summary endpoint (`/api/reports/sedo/summary`)
- ✅ Mock data for development

---

## File Change Summary

### Modified Files (Latest Session)
| File | Change Type | Description |
|------|-------------|-------------|
| `src/lib/sedo.ts` | Updated | Full Sedo API implementation |
| `src/app/api/reports/sedo/test/route.ts` | Created | API test endpoint |
| `DEV_CHANGELOG.md` | Created | This changelog file |

### Environment Variables Required
```env
# Sedo API
SEDO_PARTNER_ID=335779
SEDO_SIGN_KEY=e047c7cd90b9a452de4ad1c7c62c17
SEDO_API_URL=https://api.sedo.com/api/v1

# Authentication
AUTH_SECRET=your-secret-here
NEXTAUTH_URL=http://localhost:3000

# Database
DATABASE_URL=your-database-url

# Email
RESEND_API_KEY=your-resend-api-key
EMAIL_FROM=noreply@ekbhr.com
```

---

## Notes

- Sedo API documentation: https://api.sedo.com/apidocs/v1/
- The API implementation tries multiple endpoint variations for compatibility
- Mock data is returned as fallback when API fails or credentials are missing
- Always restart the dev server after changing `.env.local`

---

**Last Updated**: December 2025

