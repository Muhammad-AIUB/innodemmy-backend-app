-- CreateTable
CREATE TABLE "WebinarRegistration" (
    "id" TEXT NOT NULL,
    "webinarId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebinarRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WebinarRegistration_webinarId_idx" ON "WebinarRegistration"("webinarId");

-- CreateIndex
CREATE INDEX "WebinarRegistration_email_idx" ON "WebinarRegistration"("email");

-- CreateIndex
CREATE UNIQUE INDEX "WebinarRegistration_webinarId_email_key" ON "WebinarRegistration"("webinarId", "email");

-- AddForeignKey
ALTER TABLE "WebinarRegistration" ADD CONSTRAINT "WebinarRegistration_webinarId_fkey" FOREIGN KEY ("webinarId") REFERENCES "Webinar"("id") ON DELETE CASCADE ON UPDATE CASCADE;
