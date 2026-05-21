import { readFile } from 'fs/promises';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { z } from 'zod';
import type { ExerciseCatalogItem } from '@/types';

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

export async function loadExerciseCatalog(): Promise<ExerciseCatalogItem[]> {
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
