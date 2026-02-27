-- CreateEnum
CREATE TYPE "EnrollmentRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "EnrollmentRequest" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "screenshotUrl" TEXT NOT NULL,
    "status" "EnrollmentRequestStatus" NOT NULL DEFAULT 'PENDING',
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnrollmentRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EnrollmentRequest_userId_courseId_idx" ON "EnrollmentRequest"("userId", "courseId");

-- CreateIndex
CREATE INDEX "EnrollmentRequest_status_idx" ON "EnrollmentRequest"("status");

-- AddForeignKey
ALTER TABLE "EnrollmentRequest" ADD CONSTRAINT "EnrollmentRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrollmentRequest" ADD CONSTRAINT "EnrollmentRequest_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
