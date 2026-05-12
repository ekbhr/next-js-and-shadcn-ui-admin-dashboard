-- Remove Sedo integration: data cleanup, drop table, settings column, new default network.

DELETE FROM "Bidder_Sedo";
DELETE FROM "Overview_Report" WHERE "network" = 'sedo';
DELETE FROM "Domain_Assignment" WHERE "network" = 'sedo';
DELETE FROM "NetworkAccount" WHERE "network" = 'sedo';

DROP TABLE IF EXISTS "Bidder_Sedo";

ALTER TABLE "SystemSettings" DROP COLUMN IF EXISTS "lastSedoSync";

ALTER TABLE "Domain_Assignment" ALTER COLUMN "network" SET DEFAULT 'yandex';
