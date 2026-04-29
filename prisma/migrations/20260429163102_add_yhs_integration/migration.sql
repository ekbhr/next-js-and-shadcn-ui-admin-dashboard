-- Add YHS revenue table and sync timestamp column.
-- Uses IF NOT EXISTS guards so it can run safely if partially applied.

ALTER TABLE "SystemSettings"
ADD COLUMN IF NOT EXISTS "lastYhsSync" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "Bidder_YHS" (
  "id" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "domain" TEXT,
  "partnerId" INTEGER,
  "geo" TEXT,
  "initialSearches" INTEGER NOT NULL DEFAULT 0,
  "feedSearches" INTEGER NOT NULL DEFAULT 0,
  "monetizedSearches" INTEGER NOT NULL DEFAULT 0,
  "impressions" INTEGER NOT NULL DEFAULT 0,
  "clicks" INTEGER NOT NULL DEFAULT 0,
  "ctr" DOUBLE PRECISION,
  "rpm" DOUBLE PRECISION,
  "grossRevenue" DOUBLE PRECISION NOT NULL,
  "netRevenue" DOUBLE PRECISION NOT NULL,
  "revShare" DOUBLE PRECISION NOT NULL DEFAULT 80,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "coverage" DOUBLE PRECISION,
  "cpc" DOUBLE PRECISION,
  "tq" DOUBLE PRECISION,
  "status" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "userId" TEXT NOT NULL,
  "accountId" TEXT,
  CONSTRAINT "Bidder_YHS_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Bidder_YHS_date_domain_partnerId_geo_userId_key"
ON "Bidder_YHS"("date", "domain", "partnerId", "geo", "userId");

CREATE INDEX IF NOT EXISTS "Bidder_YHS_date_idx" ON "Bidder_YHS"("date");
CREATE INDEX IF NOT EXISTS "Bidder_YHS_userId_idx" ON "Bidder_YHS"("userId");
CREATE INDEX IF NOT EXISTS "Bidder_YHS_domain_idx" ON "Bidder_YHS"("domain");
CREATE INDEX IF NOT EXISTS "Bidder_YHS_partnerId_idx" ON "Bidder_YHS"("partnerId");
CREATE INDEX IF NOT EXISTS "Bidder_YHS_geo_idx" ON "Bidder_YHS"("geo");
CREATE INDEX IF NOT EXISTS "Bidder_YHS_accountId_idx" ON "Bidder_YHS"("accountId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Bidder_YHS_userId_fkey'
  ) THEN
    ALTER TABLE "Bidder_YHS"
    ADD CONSTRAINT "Bidder_YHS_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Bidder_YHS_accountId_fkey'
  ) THEN
    ALTER TABLE "Bidder_YHS"
    ADD CONSTRAINT "Bidder_YHS_accountId_fkey"
    FOREIGN KEY ("accountId") REFERENCES "NetworkAccount"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
