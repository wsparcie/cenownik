-- DropIndex
DROP INDEX "price_history_createdAt_idx";

-- CreateIndex
CREATE INDEX "config_key_idx" ON "config"("key");

-- CreateIndex
CREATE INDEX "config_value_idx" ON "config"("value");
