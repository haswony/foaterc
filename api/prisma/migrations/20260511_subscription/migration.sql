-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('FREE', 'MONTHLY');

-- AlterTable
ALTER TABLE "Store" ADD COLUMN "subscriptionPlan" "SubscriptionPlan" NOT NULL DEFAULT 'FREE',
ADD COLUMN "subscriptionExpiresAt" TIMESTAMP(3);
