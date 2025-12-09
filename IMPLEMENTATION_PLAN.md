# Reporting Dashboard - Implementation Plan

## Project Overview
**Goal**: Transform the Next.js Admin Dashboard template into a functional reporting dashboard with complete authentication system.

**Current Status**: 
- ✅ Dashboard UI template deployed at https://reporting.revengine.media/
- ✅ Authentication UI forms exist (login/register)
- ✅ **Backend authentication implemented (NextAuth.js v5)**
- ✅ **Database set up (Prisma Postgres with Accelerate)**
- ✅ **Protected routes implemented**
- ✅ **Session management working**
- ✅ **Logout functionality working**
- ✅ **Password reset flow complete** (email sending can be enhanced)

---

## Phase 1: Authentication Setup (Priority)

### Step 1: Choose Authentication Solution
**Options:**
- **NextAuth.js** (Recommended)
  - Self-hosted, full control
  - Free, open-source
  - Requires database setup
  - Best for production

- **Clerk**
  - Managed service
  - Quick setup
  - Free tier available
  - Less control over user data

**Decision**: [x] NextAuth.js  [ ] Clerk  [ ] Other: _________

### Step 2: Set Up Database
**Options:**
- **PostgreSQL** (Recommended)
  - Vercel Postgres (integrated with Vercel)
  - Supabase (free tier available)
  - Self-hosted PostgreSQL

- **MongoDB**
  - MongoDB Atlas (free tier)
  - Self-hosted MongoDB

- **SQLite**
  - Simple for development
  - Not recommended for production

**Decision**: [x] Vercel Postgres  [ ] Supabase  [ ] MongoDB Atlas  [ ] Other: _________

### Step 3: Install Dependencies
```bash
# For NextAuth.js
npm install next-auth@beta
npm install @auth/prisma-adapter  # if using Prisma
npm install bcryptjs
npm install @types/bcryptjs

# For database (choose one)
# PostgreSQL with Prisma
npm install prisma @prisma/client
npm install @auth/prisma-adapter

# OR MongoDB
npm install mongodb mongoose
```
**Status**: ✅ **COMPLETED** - All dependencies installed

### Step 4: Configure NextAuth.js
- [x] Create `src/lib/auth.ts` - NextAuth configuration
- [x] Create `src/app/api/auth/[...nextauth]/route.ts` - API route handler
- [x] Set up environment variables (.env.local)
  - `AUTH_SECRET` - Generated and added
  - `DATABASE_URL` - Configured
  - `NEXTAUTH_URL` - Set to http://localhost:3000
**Status**: ✅ **COMPLETED**

### Step 5: Set Up Database Schema
- [x] Create user model/schema
- [x] Add fields: email, password (hashed), name, createdAt, updatedAt
- [x] Add NextAuth required models (Account, Session, VerificationToken)
- [x] Run migrations - Database tables created successfully
**Status**: ✅ **COMPLETED**

### Step 6: Update Authentication Forms
- [x] Update `src/app/(main)/auth/_components/login-form.tsx`
  - Connect to NextAuth signIn
  - Handle errors properly
  - Redirect to dashboard on success
  - Added loading states

- [x] Update `src/app/(main)/auth/_components/register-form.tsx`
  - Create user in database via API route
  - Hash password with bcrypt
  - Auto-login after registration
  - Handle duplicate email errors
  - Added name field (optional)
**Status**: ✅ **COMPLETED**

### Step 7: Add Password Reset
- [x] Create forgot password page (`/auth/forgot-password`)
- [x] Create reset password page (`/auth/reset-password`)
- [x] Generate secure reset tokens (crypto.randomBytes)
- [x] Store tokens in database with expiration (PasswordResetToken model)
- [x] API routes for forgot-password and reset-password
- [ ] Add email sending functionality (SMTP or service like Resend) - Currently logs to console
**Status**: ✅ **COMPLETED** (Email sending can be enhanced later)

### Step 8: Implement Protected Routes
- [x] Create middleware for route protection (`src/middleware.ts`)
- [x] Protect `/dashboard/*` routes
- [x] Redirect unauthenticated users to login
- [x] Add SessionProvider to app layout
**Status**: ✅ **COMPLETED**

---

## Phase 2: Dashboard Customization

### Step 9: Replace Demo Data
- [ ] Remove hardcoded data from `src/data/users.ts`
- [ ] Connect dashboard to real data sources
- [ ] Create API routes for reporting data
- [ ] Update charts and tables with real data

### Step 10: Customize for Reporting
- [ ] Update dashboard metrics for reporting needs
- [ ] Add reporting-specific charts
- [ ] Create data models for reports
- [ ] Add filters and date ranges

---

## Phase 3: Additional Features

### Step 11: User Management
- [ ] User profile page
- [ ] Update profile functionality
- [ ] Change password functionality
- [ ] User settings page

### Step 12: Role-Based Access Control (RBAC)
- [ ] Add roles to user model (admin, user, viewer, etc.)
- [ ] Create role-based middleware
- [ ] Protect routes based on roles
- [ ] Add role management UI (if needed)

---

## Environment Variables Needed

Create `.env.local` file:
```env
# NextAuth.js
AUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000

# Database
DATABASE_URL=your-database-connection-string
PRISMA_DATABASE_URL=your-prisma-accelerate-url (optional, for Prisma Accelerate)

# Email (for password reset) - Using Resend
RESEND_API_KEY=re_your_resend_api_key_here
EMAIL_FROM=noreply@ekbhr.com
# Note: Domain ekbhr.com is verified in Resend
# Use any email address from the verified domain (e.g., noreply@ekbhr.com, info@ekbhr.com)
# Get your API key from: https://resend.com/api-keys
# Verify domains at: https://resend.com/domains
```

For production (Vercel):
- Add these as environment variables in Vercel dashboard
- Use Vercel's environment variable management

---

## Testing Checklist

- [x] User can register with email/password ✅
- [x] User can login with credentials ✅
- [x] User session persists across page refreshes ✅
- [x] Protected routes redirect to login if not authenticated ✅
- [x] User can logout ✅
- [x] Password reset flow works (token generation → reset link → new password) ✅
  - Note: Email sending currently logs to console (can be enhanced with email service)
- [x] Error handling works (invalid credentials, duplicate email, etc.) ✅
- [x] Forms show proper validation messages ✅

---

## Deployment Checklist

- [x] Database set up in production (Prisma Postgres via Vercel) ✅
- [ ] Environment variables configured in Vercel (DATABASE_URL, AUTH_SECRET, NEXTAUTH_URL)
- [ ] Test authentication flow in production
- [ ] Verify email sending works in production (when password reset is implemented)
- [ ] Test password reset in production (when implemented)
- [ ] Verify protected routes work correctly in production

---

## Notes

- Current authentication forms are in:
  - `src/app/(main)/login/page.tsx` ✅ Updated with NextAuth
  - `src/app/(main)/register/page.tsx` ✅ Updated with registration API
  - `src/app/(main)/forgot-password/page.tsx` ✅ Password reset request
  - `src/app/(main)/reset-password/page.tsx` ✅ Password reset
  - Routes simplified: `/login`, `/register`, `/forgot-password`, `/reset-password` (removed `/auth` prefix)

- Dashboard routes are in:
  - `src/app/(main)/dashboard/` ✅ Protected by middleware

- Server actions are in:
  - `src/server/server-actions.ts`

- Authentication files created:
  - `src/lib/auth.ts` - NextAuth configuration (exports auth, handlers)
  - `src/lib/prisma.ts` - Prisma client singleton
  - `src/app/api/auth/[...nextauth]/route.ts` - NextAuth API route
  - `src/app/api/auth/register/route.ts` - Registration API
  - `src/app/api/auth/forgot-password/route.ts` - Password reset request API
  - `src/app/api/auth/reset-password/route.ts` - Password reset API
  - `src/middleware.ts` - Route protection (NextAuth v5 compatible)
  - `src/components/providers/session-provider.tsx` - Session provider
  - `src/types/next-auth.d.ts` - TypeScript types
  - `src/app/(main)/auth/_components/forgot-password-form.tsx` - Forgot password form
  - `src/app/(main)/auth/_components/reset-password-form.tsx` - Reset password form

- Database:
  - Prisma schema: `prisma/schema.prisma` (User, Account, Session, VerificationToken, PasswordResetToken)
  - Prisma config: `prisma.config.ts` (configured for Prisma 7)
  - Generated client: `src/generated/prisma/` (custom output path)
  - Database: Vercel Postgres with Prisma Accelerate

---

## Resources

- NextAuth.js Docs: https://next-auth.js.org/
- Vercel Postgres: https://vercel.com/docs/storage/vercel-postgres
- Prisma Docs: https://www.prisma.io/docs
- Shadcn UI: https://ui.shadcn.com/

---

**Last Updated**: January 2025 (Latest: Sedo API Integration Complete)
**Status**: Phase 1 Complete ✅ | Phase 2 In Progress - Sedo API Connected ✅
**Decisions**: NextAuth.js v5 + Prisma 7 Postgres (via Vercel with Accelerate)
**Progress**: Phase 1: 8/8 steps ✅ | Phase 2: Sedo API fully integrated with credentials

### 🎯 Current Working Features:
- ✅ User registration with email/password
- ✅ User login with credentials
- ✅ Session management (JWT-based)
- ✅ Protected routes (middleware)
- ✅ Logout functionality
- ✅ Password reset (token-based, email logging to console)
- ✅ Error handling and validation
- ✅ Auto-login after registration

### ✅ Completed Today (Latest Session):
**Sedo Integration Enhancement:**
1. ✅ Created data processing utility (`src/lib/sedo-processor.ts`)
   - Transforms raw Sedo data into database-ready format
   - Calculates net revenue from gross revenue and revshare
   - Validates data integrity (dates, negative values, revshare range)
   - Adds metadata (network, source, processedAt, userId)
2. ✅ Enhanced all Sedo API endpoints with pull → process → save workflow
   - `/api/reports/sedo/revenue` - Returns raw + processed data
   - `/api/reports/sedo/geo` - Geographic breakdown with processing
   - `/api/reports/sedo/device` - Device breakdown with processing
   - `/api/reports/sedo/summary` - Summary from processed data
3. ✅ Added new query parameters to endpoints
   - `revshare`: Calculate net revenue (0-100%)
   - `save`: Flag to save to database (ready for implementation)
4. ✅ Updated documentation (`SEDO_INTEGRATION.md`)
   - Documented new workflow and response structure
   - Added examples with processed data format
5. ✅ Prepared database saving structure
   - Commented placeholders ready for Prisma models
   - `ProcessedSedoData` interface defined for future schema

### ✅ Previously Completed:
1. ✅ Installed all dependencies (NextAuth.js, Prisma, bcryptjs)
2. ✅ Set up Prisma Postgres database via Vercel
3. ✅ Created database schema with User, Account, Session, VerificationToken models
4. ✅ Ran database migrations successfully
5. ✅ Configured NextAuth.js with credentials provider
6. ✅ Updated login form to connect to backend
7. ✅ Updated register form with user creation API
8. ✅ Implemented protected routes middleware
9. ✅ Added SessionProvider to app layout
10. ✅ Created TypeScript types for NextAuth
11. ✅ Integrated Resend email service for password reset
12. ✅ Created Sedo API client service with mock data support
13. ✅ Created initial Sedo API endpoints

### ✅ Phase 1 Complete:
- All authentication functionality implemented
- Logout functionality working (fixed onSelect handler in DropdownMenuItem)
- Password reset flow complete (email sending can be enhanced)
- NextAuth v5 compatibility issues resolved
- Prisma 7 with Accelerate configured correctly

### 🔧 Technical Fixes Applied:
1. ✅ Fixed Prisma Client initialization for Prisma 7 (removed datasourceUrl, added accelerateUrl)
2. ✅ Updated NextAuth route handlers for v5 API (handlers export)
3. ✅ Fixed getServerSession → auth() for NextAuth v5 server components
4. ✅ Fixed logout button (changed onClick to onSelect for DropdownMenuItem)
5. ✅ Created singleton Prisma client pattern
6. ✅ Fixed Prisma import paths (created index.ts for easier imports)

---

## 🎯 Next Steps - Implementation Roadmap

### Priority 1: Dashboard Customization (Phase 2) - **IN PROGRESS**
**Goal**: Transform dashboard from demo to functional reporting system

**Tasks**:
- [x] Create Sedo API integration service ✅
  - `src/lib/sedo.ts` - Sedo client with mock data support
  - Supports API calls, CSV imports, manual entry (flexible structure)
- [x] Create API routes for Sedo reporting data ✅
  - `/api/reports/sedo/revenue` - Revenue data endpoints
  - `/api/reports/sedo/geo` - Geographic breakdown
  - `/api/reports/sedo/device` - Device breakdown
  - `/api/reports/sedo/summary` - Summary/overview metrics
- [x] Enhanced endpoints with data processing workflow ✅
  - Created `src/lib/sedo-processor.ts` - Data transformation utility
  - Implemented pull → process → save workflow
  - Added data validation (dates, negative values, revshare range)
  - Added revshare calculation (gross → net revenue)
  - Added metadata tracking (network, source, processedAt, userId)
  - All endpoints now return both raw and processed data
  - Ready for database saving (commented placeholders in place)
- [x] Connect to actual Sedo API ✅ **COMPLETED**
  - Added SEDO_PARTNER_ID and SEDO_SIGN_KEY to environment variables
  - Implemented actual API calls in `sedoClient`
  - Added test endpoint: `/api/reports/sedo/test`
- [ ] Define reporting data models in Prisma schema (after data structure is clarified)
  - Revenue metrics (by geo, device, section)
  - User/revshare tracking
  - Gross vs net revenue
  - Ad network identification
  - Structure ready: `ProcessedSedoData` interface defined
- [ ] Replace demo data with real Sedo data
  - Update dashboard components to fetch from API
  - Remove hardcoded JSON files
- [ ] Update dashboard components
  - Replace `SectionCards` with real Sedo metrics
  - Update `ChartAreaInteractive` with real Sedo data
  - Update `DataTable` with real reporting data
- [ ] Add date range filters
  - Date picker component
  - Filter by week/month/quarter/custom range
- [ ] Add other ad networks (Yandex, Google Ad Manager, etc.)
  - Create similar service structure for each network
  - Aggregate data from multiple sources

**Estimated Time**: 2-4 hours  
**Impact**: Makes dashboard functional and useful

**Status**: ✅ **API Endpoints Created & Enhanced** - Ready for Sedo API integration
- All endpoints follow pull → process → save workflow
- Data processing and validation implemented
- Database saving structure ready (awaiting Prisma models)

---

### Priority 2: Email Service Integration (Quick Win) ✅ **COMPLETED**
**Goal**: Complete password reset flow with real email sending

**Tasks**:
- [x] Choose email service (Resend - easy setup) ✅
- [x] Install email service package ✅
- [x] Create email utility function ✅
- [x] Create password reset email template ✅
- [x] Update forgot-password API route to send emails ✅
- [ ] Test email delivery in development
- [ ] Configure production email settings

**Estimated Time**: 30 minutes  
**Impact**: Completes authentication flow

**Status**: ✅ **COMPLETED** - Email service integrated with Resend
- Email utility created: `src/lib/email.ts`
- Email template created: `src/lib/email-templates.ts`
- Forgot password route updated to send emails
- **Next Step**: Get Resend API key and add to `.env.local`

---

### Priority 3: User Profile & Settings
**Goal**: Allow users to manage their accounts

**Tasks**:
- [ ] Create user profile page (`/dashboard/profile`)
- [ ] Add "Update Profile" functionality
  - Update name, email
  - Upload avatar
- [ ] Add "Change Password" functionality
- [ ] Create user settings page
  - Theme preferences (already exists)
  - Notification settings
  - Account preferences

**Estimated Time**: 1-2 hours  
**Impact**: Improves user experience

---

### Priority 4: Role-Based Access Control (RBAC)
**Goal**: Implement user roles and permissions

**Tasks**:
- [ ] Add `role` field to User model in Prisma schema
  - Roles: `admin`, `user`, `viewer`
- [ ] Create role-based middleware
- [ ] Protect routes based on roles
- [ ] Add role management UI (if needed)
- [ ] Update user registration to assign default role

**Estimated Time**: 2-3 hours  
**Impact**: Adds security and access control

---

## 📝 Notes on Next Steps

- **Sedo API Integration** - Ready to implement actual API calls when credentials are provided
- **Database Models** - Define Prisma schema based on `ProcessedSedoData` interface
- **Database Saving** - Uncomment and implement save logic in endpoints once models are ready
- **Dashboard Components** - Connect dashboard UI to these enhanced endpoints
- **User Profile** and **RBAC** can be implemented as needed
- **Other Networks** - Extend structure for Yandex, Google Ad Manager, etc.

## 📋 Current File Structure

**Sedo Integration:**
- `src/lib/sedo.ts` - Sedo API client (pulls data)
- `src/lib/sedo-processor.ts` - Data processor (transforms & validates) ✨ NEW
- `src/app/api/reports/sedo/revenue/route.ts` - Revenue endpoint (enhanced)
- `src/app/api/reports/sedo/geo/route.ts` - Geo endpoint (enhanced)
- `src/app/api/reports/sedo/device/route.ts` - Device endpoint (enhanced)
- `src/app/api/reports/sedo/summary/route.ts` - Summary endpoint (enhanced)
- `SEDO_INTEGRATION.md` - Complete documentation (updated)

