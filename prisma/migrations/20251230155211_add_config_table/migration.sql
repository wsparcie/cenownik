-- CreateTable
CREATE TABLE "config" (
    "key" VARCHAR(100) NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "config_pkey" PRIMARY KEY ("key")
);
