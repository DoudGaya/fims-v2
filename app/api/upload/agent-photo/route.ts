import { NextRequest, NextResponse } from 'next/server';
import { uploadToS3 } from '@/lib/s3';

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * POST /api/upload/agent-photo
 * Public endpoint — used from the agent application form before account creation.
 * Accepts a multipart/form-data body with a single "file" field.
 */
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Only JPEG, PNG, or WebP images are accepted.' },
        { status: 400 },
      );
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'File size must not exceed 5 MB.' },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Sanitise the original filename — strip everything except alphanumerics, dots, hyphens, underscores
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').toLowerCase();
    const key = `agent-photos/${Date.now()}-${safeName}`;

    const url = await uploadToS3(buffer, key, file.type);

    return NextResponse.json({ url }, { status: 200 });
  } catch (err) {
    console.error('Agent photo upload error:', err);
    return NextResponse.json(
      { error: 'Upload failed. Please try again.' },
      { status: 500 },
    );
  }
}
