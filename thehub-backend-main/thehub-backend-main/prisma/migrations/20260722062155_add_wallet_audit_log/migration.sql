-- CreateTable
CREATE TABLE "wallet_audit_log" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "walletReferenceId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "montant" DECIMAL(10,2),
    "statusCode" INTEGER NOT NULL,
    "success" BOOLEAN NOT NULL,
    "errorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "wallet_audit_log_userId_idx" ON "wallet_audit_log"("userId");
