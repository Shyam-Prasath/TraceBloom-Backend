-- DropForeignKey
ALTER TABLE "Batch" DROP CONSTRAINT "Batch_farmerWallet_fkey";

-- AlterTable
ALTER TABLE "Batch" ADD COLUMN     "farmerId" TEXT;

-- CreateTable
CREATE TABLE "ConsumerBatch" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "consumerId" TEXT NOT NULL,
    "consumerEmail" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsumerBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsumerPayment" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "consumerId" TEXT NOT NULL,
    "distributorId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsumerPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsumerReview" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "consumerId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsumerReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConsumerBatch_batchId_consumerId_key" ON "ConsumerBatch"("batchId", "consumerId");

-- CreateIndex
CREATE UNIQUE INDEX "ConsumerReview_batchId_consumerId_key" ON "ConsumerReview"("batchId", "consumerId");

-- AddForeignKey
ALTER TABLE "Batch" ADD CONSTRAINT "Batch_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsumerBatch" ADD CONSTRAINT "ConsumerBatch_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("batchId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsumerBatch" ADD CONSTRAINT "ConsumerBatch_consumerId_fkey" FOREIGN KEY ("consumerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsumerPayment" ADD CONSTRAINT "ConsumerPayment_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("batchId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsumerPayment" ADD CONSTRAINT "ConsumerPayment_consumerId_fkey" FOREIGN KEY ("consumerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsumerPayment" ADD CONSTRAINT "ConsumerPayment_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsumerReview" ADD CONSTRAINT "ConsumerReview_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("batchId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsumerReview" ADD CONSTRAINT "ConsumerReview_consumerId_fkey" FOREIGN KEY ("consumerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
