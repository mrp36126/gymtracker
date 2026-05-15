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
  const mediaKind = formData.get('mediaKind') === 'detail' ? 'detail' : 'card';

  if (!file || !exerciseId) {
    return NextResponse.json({ error: 'file and exerciseId are required' }, { status: 400 });
  }

  // Validate file type
  const imageTypes = ['image/jpeg','image/png','image/gif','image/webp'];
  const videoTypes = ['video/mp4','video/quicktime'];
  const allowed = mediaKind === 'detail' ? imageTypes : [...imageTypes, ...videoTypes];
  if (!allowed.includes(file.type)) {
    const message = mediaKind === 'detail'
      ? 'Only images (JPG, PNG, GIF, WebP) are allowed for detail images'
      : 'Only images (JPG, PNG, GIF, WebP) and videos (MP4, MOV) are allowed';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const exercise = await prisma.exercise.findFirst({
    where: { id: exerciseId, program: { userId: user!.id } },
  });
  if (!exercise) {
    return NextResponse.json({ error: 'Exercise not found' }, { status: 404 });
  }

  // Build filename from exercise name e.g. "Bench Press" -> "bench-press.jpg"
  const ext = file.name.split('.').pop();
  const safeName = exercise.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const folder = mediaKind === 'detail' ? 'exercise-details' : 'exercises';
  const suffix = mediaKind === 'detail' ? 'detail' : 'media';
  const filePath = `${folder}/${safeName}-${exerciseId.slice(-6)}-${suffix}.${ext}`;

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
  const data = mediaKind === 'detail'
    ? { detailImageUrl: urlData.publicUrl }
    : { mediaUrl: urlData.publicUrl };

  await prisma.exercise.update({
    where: { id: exerciseId },
    data,
  });

  return NextResponse.json({ data }, { status: 201 });
}
