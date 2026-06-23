import { readFile } from 'fs/promises';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { z } from 'zod';
import type { ExerciseCatalogItem } from '@/types';
import { prisma } from './prisma';

const ExerciseCatalogRowSchema = z.object({
  id: z.string().min(2).max(50),
  exerciseName: z.string().min(2).max(120),
  category: z.string().min(2).max(80),
  primaryMuscles: z.string().min(2),
  secondaryMuscles: z.string().optional().default(''),
  equipment: z.string().min(2).max(80),
  difficulty: z.string().min(2).max(40),
  description: z.string().min(2).max(300),
  instructions: z.string().min(2).max(1000),
  imageUrl: z.string().optional().default(''),
  detailImageUrl: z.string().optional().default(''),
});

function splitMuscles(value: string) {
  return value
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean);
}

async function loadCatalogFromCsv(): Promise<ExerciseCatalogItem[]> {
  const csvPath = path.join(process.cwd(), 'data', 'exercises.csv');
  const csvText = await readFile(csvPath, 'utf8');

  const records = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  const items: ExerciseCatalogItem[] = [];
  const errors: string[] = [];

  for (let i = 0; i < records.length; i++) {
    const result = ExerciseCatalogRowSchema.safeParse(records[i]);

    if (!result.success) {
      errors.push(`Row ${i + 2}: ${result.error.issues.map((issue) => issue.message).join(', ')}`);
      continue;
    }

    items.push({
      ...result.data,
      primaryMuscles: splitMuscles(result.data.primaryMuscles),
      secondaryMuscles: splitMuscles(result.data.secondaryMuscles),
    });
  }

  if (errors.length > 0) {
    throw new Error(`Exercise CSV validation failed:\n${errors.join('\n')}`);
  }

  return items;
}

async function seedCatalogFromCsvIfNeeded() {
  const existingCount = await prisma.exerciseCatalog.count();
  if (existingCount > 0) return;

  const csvItems = await loadCatalogFromCsv();
  await prisma.exerciseCatalog.createMany({
    data: csvItems.map((item) => ({
      id: item.id,
      exerciseName: item.exerciseName,
      category: item.category,
      primaryMuscles: item.primaryMuscles,
      secondaryMuscles: item.secondaryMuscles,
      equipment: item.equipment,
      difficulty: item.difficulty,
      description: item.description,
      instructions: item.instructions,
      imageUrl: item.imageUrl || null,
      detailImageUrl: item.detailImageUrl || null,
    })),
    skipDuplicates: true,
  });
}

export async function loadExerciseCatalog(): Promise<ExerciseCatalogItem[]> {
  try {
    await seedCatalogFromCsvIfNeeded();

    const catalog = await prisma.exerciseCatalog.findMany({
      orderBy: [{ exerciseName: 'asc' }, { id: 'asc' }],
    });

    return catalog.map((exercise) => ({
      id: exercise.id,
      exerciseName: exercise.exerciseName,
      category: exercise.category,
      primaryMuscles: exercise.primaryMuscles,
      secondaryMuscles: exercise.secondaryMuscles,
      equipment: exercise.equipment,
      difficulty: exercise.difficulty,
      description: exercise.description,
      instructions: exercise.instructions,
      imageUrl: exercise.imageUrl ?? '',
      detailImageUrl: exercise.detailImageUrl ?? '',
    }));
  } catch {
    // Fallback keeps the app running if migration has not yet been applied.
    return loadCatalogFromCsv();
  }
}
