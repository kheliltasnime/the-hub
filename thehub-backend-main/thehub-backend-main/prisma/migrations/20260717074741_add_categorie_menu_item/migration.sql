/*
  Warnings:

  - Added the required column `categorie` to the `menu_items` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "menu_items" ADD COLUMN     "categorie" TEXT NOT NULL;
