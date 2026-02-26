-- Step 1: Add order columns with default 0 (nullable temporarily)
ALTER TABLE "CourseModule" ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Lesson" ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0;

-- Step 2: Backfill incremental order values for existing modules (per course)
WITH numbered_modules AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "courseId" ORDER BY "createdAt" ASC) - 1 AS rn
  FROM "CourseModule"
)
UPDATE "CourseModule"
SET "order" = numbered_modules.rn
FROM numbered_modules
WHERE "CourseModule".id = numbered_modules.id;

-- Step 3: Backfill incremental order values for existing lessons (per module)
WITH numbered_lessons AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "moduleId" ORDER BY "createdAt" ASC) - 1 AS rn
  FROM "Lesson"
)
UPDATE "Lesson"
SET "order" = numbered_lessons.rn
FROM numbered_lessons
WHERE "Lesson".id = numbered_lessons.id;

-- Step 4: Add unique constraints
CREATE UNIQUE INDEX "CourseModule_courseId_order_key" ON "CourseModule"("courseId", "order");
CREATE UNIQUE INDEX "Lesson_moduleId_order_key" ON "Lesson"("moduleId", "order");
