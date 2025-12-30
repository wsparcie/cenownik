-- CreateTable
CREATE TABLE "price_history" (
    "id" SERIAL NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "previousPrice" DECIMAL(10,2),
    "targetPriceReached" BOOLEAN NOT NULL DEFAULT false,
    "targetPriceAtTime" DECIMAL(10,2),
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "offerId" INTEGER NOT NULL,

    CONSTRAINT "price_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "price_history_offerId_idx" ON "price_history"("offerId");

-- CreateIndex
CREATE INDEX "price_history_createdAt_idx" ON "price_history"("createdAt");

-- CreateIndex
CREATE INDEX "price_history_targetPriceReached_idx" ON "price_history"("targetPriceReached");

-- AddForeignKey
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
