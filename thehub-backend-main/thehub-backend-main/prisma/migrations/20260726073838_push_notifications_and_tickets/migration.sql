-- AlterTable
ALTER TABLE "users" ADD COLUMN     "fcmToken" TEXT;

-- CreateTable
CREATE TABLE "tickets" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "orderId" TEXT,
    "userId" TEXT,
    "details" JSONB,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tickets_status_idx" ON "tickets"("status");
