import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { parseProgramCsv } from '@/lib/csv-parser';
import { createSupabaseServerClient } from '@/lib/supabase';
import { findActivePrimaryProgramForUser } from '@/lib/program-scope';
import { loadExerciseCatalog } from '@/lib/exercise-catalog';
import { isAdmin, isTrainer } from '@/lib/rbac';
import { z } from 'zod';

const ProgramTypeSchema = z.enum(['primary', 'supplementary']).default('primary');
const DaySchema = z.enum(['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']);

const SelectedExerciseSchema = z.object({
  exerciseId: z.string().min(1),
  day: DaySchema,
  order: z.coerce.number().int().positive(),
  sets: z.coerce.number().int().positive().max(20),
  reps: z.string().regex(/^\d+(-\d+)?$/, 'Reps must be e.g. 10 or 8-12'),
  notes: z.string().max(1000).optional().default(''),
});

const ProgramFromCatalogSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional().default(''),
  programType: ProgramTypeSchema,
  exercises: z.array(SelectedExerciseSchema).min(1, 'Choose at least one exercise'),
});

function catalogKey(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}

export async function GET() {
  const { user, response } = await requireAuth();
  if (response) return response;

  if (!isAdmin(user!) && !isTrainer(user!)) {
    const activePrimaryProgram = await findActivePrimaryProgramForUser(user!.id);
    if (!activePrimaryProgram) {
      return NextResponse.json({ error: 'Program assignment required' }, { status: 403 });
    }
  }

  const programs = await prisma.program.findMany({
    where: { userId: user!.id },
    include: { _count: { select: { exercises: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ data: programs });
}

export async function POST(req: NextRequest) {
  const { user, response } = await requireAuth();
  if (response) return response;

  const contentType = req.headers.get('content-type') ?? '';

  if (contentType.includes('multipart/form-data') && !isAdmin(user!)) {
    return NextResponse.json({ error: 'CSV uploads are admin only' }, { status: 403 });
  }

  if (!isAdmin(user!) && !isTrainer(user!)) {
    return NextResponse.json({ error: 'Program management required' }, { status: 403 });
  }

  if (contentType.includes('application/json')) {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsedBody = ProgramFromCatalogSchema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json({
        error: parsedBody.error.issues.map((issue) => issue.message).join('\n'),
      }, { status: 422 });
    }

    let catalog;
    try {
      catalog = await loadExerciseCatalog();
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Unable to load exercise catalog' }, { status: 500 });
    }

    const catalogById = new Map(catalog.map((exercise) => [exercise.id, exercise]));
    const missing = parsedBody.data.exercises
      .filter((exercise) => !catalogById.has(exercise.exerciseId))
      .map((exercise) => exercise.exerciseId);

    if (missing.length > 0) {
      return NextResponse.json({ error: `Unknown exercise id(s): ${missing.join(', ')}` }, { status: 422 });
    }

    const program = await prisma.program.create({
      data: {
        name: parsedBody.data.name.trim(),
        description: parsedBody.data.description.trim() || null,
        programType: parsedBody.data.programType,
        userId: user!.id,
        exercises: {
          create: parsedBody.data.exercises.map((selected) => {
            const catalogExercise = catalogById.get(selected.exerciseId)!;
            return {
              name: catalogExercise.exerciseName,
              muscleGroup: catalogExercise.category,
              day: selected.day,
              order: selected.order,
              defaultSets: selected.sets,
              defaultReps: selected.reps,
              notes: selected.notes || catalogExercise.instructions,
              mediaUrl: catalogExercise.imageUrl || null,
              detailImageUrl: catalogExercise.detailImageUrl || null,
            };
          }),
        },
      },
      include: { exercises: true },
    });

    return NextResponse.json({ data: program }, { status: 201 });
  }

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const name = formData.get('name') as string | null;
  const programTypeResult = ProgramTypeSchema.safeParse((formData.get('programType') as string) || 'primary');
  const description = (formData.get('description') as string) || '';

  if (!file || !name) {
    return NextResponse.json({ error: 'file and name are required' }, { status: 400 });
  }

  if (!programTypeResult.success) {
    return NextResponse.json({ error: 'Invalid program type' }, { status: 400 });
  }

  if (!file.name.endsWith('.csv')) {
    return NextResponse.json({ error: 'Only CSV files are accepted' }, { status: 400 });
  }

  const csvText = await file.text();

  let parsed;
  try {
    parsed = parseProgramCsv(csvText);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 422 });
  }

  let catalogByName = new Map<string, Awaited<ReturnType<typeof loadExerciseCatalog>>[number]>();
  try {
    const catalog = await loadExerciseCatalog();
    catalogByName = new Map(catalog.map((exercise) => [catalogKey(exercise.exerciseName), exercise]));
  } catch {
    catalogByName = new Map();
  }

  // Upload to Supabase Storage
  const supabase = await createSupabaseServerClient();
  const filePath = `programs/${Date.now()}.csv`;

  await supabase.storage.from('gymtracker').upload(filePath, file, { upsert: true });
  const { data: urlData } = supabase.storage.from('gymtracker').getPublicUrl(filePath);

  // Create program in database
  const program = await prisma.program.create({
    data: {
      name,
      description: description || null,
      programType: programTypeResult.data,
      csvUrl: urlData.publicUrl,
      userId: user!.id,
      exercises: {
        create: parsed.map((row) => {
          const catalogExercise = catalogByName.get(catalogKey(row.exercise_name));
          return {
            name: row.exercise_name,
            muscleGroup: row.muscle_group,
            day: row.day,
            order: row.order,
            defaultSets: row.sets,
            defaultReps: row.reps,
            notes: row.notes || catalogExercise?.instructions || '',
            mediaUrl: catalogExercise?.imageUrl || null,
            detailImageUrl: catalogExercise?.detailImageUrl || null,
          };
        }),
      },
    },
    include: { exercises: true },
  });

  return NextResponse.json({ data: program }, { status: 201 });
}
