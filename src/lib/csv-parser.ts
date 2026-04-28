import { parse } from 'csv-parse/sync';
import { z } from 'zod';

const VALID_DAYS = [
  'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'
] as const;

const ExerciseRowSchema = z.object({
  day:           z.enum(VALID_DAYS),
  order:         z.coerce.number().int().positive(),
  exercise_name: z.string().min(2).max(100),
  muscle_group:  z.string().min(2).max(50),
  sets:          z.coerce.number().int().positive().max(20),
  reps:          z.string().regex(/^\d+(-\d+)?$/, 'Reps must be e.g. 10 or 8-12'),
  notes:         z.string().max(255).optional().default(''),
});

export type ParsedExercise = z.infer<typeof ExerciseRowSchema>;

export function parseProgramCsv(csvText: string): ParsedExercise[] {
  const records = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  const results: ParsedExercise[] = [];
  const errors: string[] = [];

  for (let i = 0; i < records.length; i++) {
    const result = ExerciseRowSchema.safeParse(records[i]);
    if (!result.success) {
      errors.push(`Row ${i + 2}: ${result.error.issues.map((e: any) => e.message).join(', ')}`);
    } else {
      results.push(result.data);
    }
  }

  if (errors.length > 0) {
    throw new Error(`CSV validation failed:\n${errors.join('\n')}`);
  }

  return results;
}
