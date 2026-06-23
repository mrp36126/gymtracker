import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { isAdmin } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { createSupabaseServerClient } from '@/lib/supabase';

function toSlug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireAuth();
  if (response) return response;
  if (!isAdmin(user)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { id } = await params;
  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const mediaKind = formData.get('mediaKind') === 'detail' ? 'detail' : 'card';

  if (!file) {
    return NextResponse.json({ error: 'file is required' }, { status: 400 });
  }

  const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedImageTypes.includes(file.type)) {
    return NextResponse.json({ error: 'Only images (JPG, PNG, GIF, WebP) are allowed' }, { status: 400 });
  }

  const exercise = await prisma.exerciseCatalog.findUnique({ where: { id } });
  if (!exercise) {
    return NextResponse.json({ error: 'Exercise not found' }, { status: 404 });
  }

  const ext = file.name.split('.').pop() || 'jpg';
  const safeName = toSlug(exercise.exerciseName) || exercise.id;
  const suffix = mediaKind === 'detail' ? 'detail' : 'card';
  const filePath = `exercise-catalog/${safeName}-${exercise.id.slice(-6)}-${suffix}.${ext}`;

  const supabase = await createSupabaseServerClient();
  const { error: uploadError } = await supabase.storage
    .from('gymtracker')
    .upload(filePath, file, { upsert: true, contentType: file.type });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: publicData } = supabase.storage.from('gymtracker').getPublicUrl(filePath);
  const publicUrl = publicData.publicUrl;

  const data = mediaKind === 'detail'
    ? { detailImageUrl: publicUrl }
    : { imageUrl: publicUrl };

  const updated = await prisma.exerciseCatalog.update({
    where: { id: exercise.id },
    data,
  });

  return NextResponse.json({
    data: {
      id: updated.id,
      imageUrl: updated.imageUrl,
      detailImageUrl: updated.detailImageUrl,
    },
  }, { status: 201 });
}
