/*
  Warnings:

  - A unique constraint covering the columns `[clientRequestId]` on the table `orders` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "clientRequestId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "orders_clientRequestId_key" ON "orders"("clientRequestId");
