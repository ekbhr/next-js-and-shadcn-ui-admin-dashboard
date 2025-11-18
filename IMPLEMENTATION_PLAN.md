# Reporting Dashboard - Implementation Plan

## Project Overview
**Goal**: Transform the Next.js Admin Dashboard template into a functional reporting dashboard with complete authentication system.

**Current Status**: 
- ✅ Dashboard UI template deployed at https://reporting.ekbhr.com/
- ✅ Authentication UI forms exist (login/register)
- ❌ No backend authentication
- ❌ No database
- ❌ No protected routes
- ❌ No session management

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

**Decision**: [ ] NextAuth.js  [ ] Clerk  [ ] Other: _________

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

**Decision**: [ ] Vercel Postgres  [ ] Supabase  [ ] MongoDB Atlas  [ ] Other: _________

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

### Step 4: Configure NextAuth.js
- [ ] Create `src/lib/auth.ts` - NextAuth configuration
- [ ] Create `src/app/api/auth/[...nextauth]/route.ts` - API route handler
- [ ] Set up environment variables (.env.local)
  - `AUTH_SECRET`
  - `DATABASE_URL`
  - `NEXTAUTH_URL`

### Step 5: Set Up Database Schema
- [ ] Create user model/schema
- [ ] Add fields: email, password (hashed), name, createdAt, updatedAt
- [ ] Add password reset tokens (if implementing reset)
- [ ] Run migrations

### Step 6: Update Authentication Forms
- [ ] Update `src/app/(main)/auth/_components/login-form.tsx`
  - Connect to NextAuth signIn
  - Handle errors properly
  - Redirect to dashboard on success

- [ ] Update `src/app/(main)/auth/_components/register-form.tsx`
  - Create user in database
  - Hash password with bcrypt
  - Auto-login after registration
  - Handle duplicate email errors

### Step 7: Add Password Reset
- [ ] Create forgot password page
- [ ] Create reset password page
- [ ] Add email sending functionality (SMTP or service like Resend)
- [ ] Generate secure reset tokens
- [ ] Store tokens in database with expiration

### Step 8: Implement Protected Routes
- [ ] Create middleware for route protection
- [ ] Protect `/dashboard/*` routes
- [ ] Redirect unauthenticated users to login
- [ ] Add session check in dashboard layout

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

# Email (for password reset)
SMTP_HOST=your-smtp-host
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
EMAIL_FROM=noreply@ekbhr.com
```

For production (Vercel):
- Add these as environment variables in Vercel dashboard
- Use Vercel's environment variable management

---

## Testing Checklist

- [ ] User can register with email/password
- [ ] User can login with credentials
- [ ] User session persists across page refreshes
- [ ] Protected routes redirect to login if not authenticated
- [ ] User can logout
- [ ] Password reset flow works (email → reset link → new password)
- [ ] Error handling works (invalid credentials, duplicate email, etc.)
- [ ] Forms show proper validation messages

---

## Deployment Checklist

- [ ] Database set up in production (Vercel Postgres/Supabase/etc.)
- [ ] Environment variables configured in Vercel
- [ ] Test authentication flow in production
- [ ] Verify email sending works in production
- [ ] Test password reset in production
- [ ] Verify protected routes work correctly

---

## Notes

- Current authentication forms are in:
  - `src/app/(main)/auth/v1/login/page.tsx`
  - `src/app/(main)/auth/v1/register/page.tsx`
  - `src/app/(main)/auth/v2/login/page.tsx`
  - `src/app/(main)/auth/v2/register/page.tsx`

- Dashboard routes are in:
  - `src/app/(main)/dashboard/`

- Server actions are in:
  - `src/server/server-actions.ts`

- Current user data (static) is in:
  - `src/data/users.ts`

---

## Resources

- NextAuth.js Docs: https://next-auth.js.org/
- Vercel Postgres: https://vercel.com/docs/storage/vercel-postgres
- Prisma Docs: https://www.prisma.io/docs
- Shadcn UI: https://ui.shadcn.com/

---

**Last Updated**: [Date will be updated as we progress]
**Status**: Planning Phase

