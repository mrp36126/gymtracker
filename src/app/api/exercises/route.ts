import { NextResponse } from 'next/server';
import { loadExerciseCatalog } from '@/lib/exercise-catalog';

export async function GET() {
  try {
    const exercises = await loadExerciseCatalog();
    return NextResponse.json({ exercises });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to load exercise catalog' },
      { status: 500 }
    );
  }
}
