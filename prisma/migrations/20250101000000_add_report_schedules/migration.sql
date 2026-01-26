-- CreateTable
CREATE TABLE "ReportSchedule" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "scheduleType" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSent" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "ReportSchedule_pkey" PRIMARY KEY ("id")
);
