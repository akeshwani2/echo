/*
  Warnings:

  - You are about to drop the `EmailContext` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProcessedEmail` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "EmailContext" DROP CONSTRAINT "EmailContext_chatId_fkey";

-- DropTable
DROP TABLE "EmailContext";

-- DropTable
DROP TABLE "ProcessedEmail";

-- CreateTable
CREATE TABLE "OAuthTokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "expiryDate" TIMESTAMP(3),
    "tokenData" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OAuthTokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OAuthTokens_userId_provider_key" ON "OAuthTokens"("userId", "provider");
