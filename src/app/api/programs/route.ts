import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { parseProgramCsv } from '@/lib/csv-parser';
import { createSupabaseServerClient } from '@/lib/supabase';

export async function GET() {
  const { user, response } = await requireAuth();
  if (response) return response;

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

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const name = formData.get('name') as string | null;

  if (!file || !name) {
    return NextResponse.json({ error: 'file and name are required' }, { status: 400 });
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

  const supabase = await createSupabaseServerClient();
  const filePath = `programs/${user!.id}/${Date.now()}.csv`;
  await supabase.storage.from('gymtracker').upload(filePath, file, { upsert: true });
  const { data: urlData } = supabase.storage.from('gymtracker').getPublicUrl(filePath);

  const program = await prisma.program.create({
    data: {
      name,
      csvUrl: urlData.publicUrl,
      userId: user!.id,
      exercises: {
        create: parsed.map(row => ({
          name:        row.exercise_name,
          muscleGroup: row.muscle_group,
          day:         row.day,
          order:       row.order,
          defaultSets: row.sets,
          defaultReps: row.reps,
          notes:       row.notes ?? '',
        })),
      },
    },
    include: { exercises: true },
  });

  return NextResponse.json({ data: program }, { status: 201 });
}
