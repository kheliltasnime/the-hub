-- CreateEnum
CREATE TYPE "ProfileType" AS ENUM ('etudiant', 'professionnel');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('user', 'super_admin', 'manager_fnb', 'manager_coworking', 'sav', 'kds_chef', 'kds_equipier', 'kds_manager', 'pos_caissier', 'pos_manager');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "profileType" "ProfileType" NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'user',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
