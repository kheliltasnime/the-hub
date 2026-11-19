-- DropForeignKey
ALTER TABLE "user_events" DROP CONSTRAINT "user_events_userId_fkey";

-- AlterTable
ALTER TABLE "user_events" ALTER COLUMN "userId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "user_events" ADD CONSTRAINT "user_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
