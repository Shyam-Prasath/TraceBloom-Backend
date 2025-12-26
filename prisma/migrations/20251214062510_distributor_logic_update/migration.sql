/*
  Warnings:

  - You are about to drop the column `verified` on the `DistributorBatch` table. All the data in the column will be lost.
  - You are about to drop the column `date` on the `Payment` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[batchId,distributorId]` on the table `DistributorBatch` will be added. If there are existing duplicate values, this will fail.
  - Made the column `farmerName` on table `Batch` required. This step will fail if there are existing NULL values in that column.
  - Made the column `farmerPhone` on table `Batch` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `distributorId` to the `Payment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Batch" ALTER COLUMN "farmerName" SET NOT NULL,
ALTER COLUMN "farmerPhone" SET NOT NULL;

-- AlterTable
ALTER TABLE "DistributorBatch" DROP COLUMN "verified";

-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "date",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "distributorId" TEXT NOT NULL,
ALTER COLUMN "amount" SET DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "DistributorBatch_batchId_distributorId_key" ON "DistributorBatch"("batchId", "distributorId");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
