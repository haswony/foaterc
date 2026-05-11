-- AlterTable
ALTER TABLE "Debt" ADD COLUMN     "archivedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'IQD';

-- CreateIndex
CREATE INDEX "Debt_archivedAt_idx" ON "Debt"("archivedAt");
