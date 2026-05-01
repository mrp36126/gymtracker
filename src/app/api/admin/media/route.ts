import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createSupabaseServerClient } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const { user, response } = await requireAuth();
  if (response) return response;
  if (!user!.isAdmin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const exerciseId = formData.get('exerciseId') as string | null;

  if (!file || !exerciseId) {
    return NextResponse.json({ error: 'file and exerciseId are required' }, { status: 400 });
  }

  // Validate file type
  const allowed = ['image/jpeg','image/png','image/gif','image/webp','video/mp4','video/quicktime'];
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: 'Only images (JPG, PNG, GIF, WebP) and videos (MP4, MOV) are allowed' }, { status: 400 });
  }

  // Get exercise to build a clean filename
  const exercise = await prisma.exercise.findUnique({ where: { id: exerciseId } });
  if (!exercise) {
    return NextResponse.json({ error: 'Exercise not found' }, { status: 404 });
  }

  // Build filename from exercise name e.g. "Bench Press" -> "bench-press.jpg"
  const ext = file.name.split('.').pop();
  const safeName = exercise.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const filePath = `exercises/${safeName}-${exerciseId.slice(-6)}.${ext}`;

  // Upload to Supabase Storage
  const supabase = await createSupabaseServerClient();
  const { error: uploadError } = await supabase.storage
    .from('gymtracker')
    .upload(filePath, file, { upsert: true, contentType: file.type });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: urlData } = supabase.storage.from('gymtracker').getPublicUrl(filePath);

  // Save URL to exercise record
  await prisma.exercise.update({
    where: { id: exerciseId },
    data: { mediaUrl: urlData.publicUrl },
  });

  return NextResponse.json({ data: { mediaUrl: urlData.publicUrl } }, { status: 201 });
}
