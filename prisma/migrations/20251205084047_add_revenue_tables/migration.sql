-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bidder_Sedo" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "domain" TEXT,
    "c1" TEXT,
    "c2" TEXT,
    "c3" TEXT,
    "grossRevenue" DOUBLE PRECISION NOT NULL,
    "netRevenue" DOUBLE PRECISION NOT NULL,
    "revShare" DOUBLE PRECISION NOT NULL DEFAULT 80,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "impressions" INTEGER NOT NULL,
    "clicks" INTEGER NOT NULL,
    "ctr" DOUBLE PRECISION,
    "rpm" DOUBLE PRECISION,
    "status" TEXT,
    "tag" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Bidder_Sedo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Domain_Assignment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "domain" TEXT,
    "network" TEXT,
    "revShare" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Domain_Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Overview_Report" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "network" TEXT NOT NULL,
    "domain" TEXT,
    "grossRevenue" DOUBLE PRECISION NOT NULL,
    "netRevenue" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "impressions" INTEGER NOT NULL,
    "clicks" INTEGER NOT NULL,
    "ctr" DOUBLE PRECISION,
    "rpm" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Overview_Report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "PasswordResetToken_token_idx" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE INDEX "Bidder_Sedo_date_idx" ON "Bidder_Sedo"("date");

-- CreateIndex
CREATE INDEX "Bidder_Sedo_userId_idx" ON "Bidder_Sedo"("userId");

-- CreateIndex
CREATE INDEX "Bidder_Sedo_domain_idx" ON "Bidder_Sedo"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "Bidder_Sedo_date_domain_c1_c2_c3_userId_key" ON "Bidder_Sedo"("date", "domain", "c1", "c2", "c3", "userId");

-- CreateIndex
CREATE INDEX "Domain_Assignment_userId_idx" ON "Domain_Assignment"("userId");

-- CreateIndex
CREATE INDEX "Domain_Assignment_domain_idx" ON "Domain_Assignment"("domain");

-- CreateIndex
CREATE INDEX "Domain_Assignment_network_idx" ON "Domain_Assignment"("network");

-- CreateIndex
CREATE UNIQUE INDEX "Domain_Assignment_userId_domain_network_key" ON "Domain_Assignment"("userId", "domain", "network");

-- CreateIndex
CREATE INDEX "Overview_Report_date_idx" ON "Overview_Report"("date");

-- CreateIndex
CREATE INDEX "Overview_Report_network_idx" ON "Overview_Report"("network");

-- CreateIndex
CREATE INDEX "Overview_Report_userId_idx" ON "Overview_Report"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Overview_Report_date_network_domain_userId_key" ON "Overview_Report"("date", "network", "domain", "userId");

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bidder_Sedo" ADD CONSTRAINT "Bidder_Sedo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Domain_Assignment" ADD CONSTRAINT "Domain_Assignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Overview_Report" ADD CONSTRAINT "Overview_Report_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
