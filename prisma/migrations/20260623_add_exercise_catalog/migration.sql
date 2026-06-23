-- CreateTable
CREATE TABLE "exercise_catalog" (
    "id" TEXT NOT NULL,
    "exerciseName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "primaryMuscles" TEXT[] NOT NULL,
    "secondaryMuscles" TEXT[] NOT NULL,
    "equipment" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "imageUrl" TEXT,
    "detailImageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exercise_catalog_pkey" PRIMARY KEY ("id")
);
