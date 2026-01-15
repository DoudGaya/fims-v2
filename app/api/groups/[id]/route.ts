import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = req.nextUrl.clone();
  url.pathname = `/api/roles/${id}`;
  return NextResponse.redirect(url);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = req.nextUrl.clone();
  url.pathname = `/api/roles/${id}`;
  
  return NextResponse.json({
    message: 'Groups have been unified with roles. Please use the /api/roles endpoint.',
    newEndpoint: url.toString()
  });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = req.nextUrl.clone();

  url.pathname = `/api/roles/${id}`;
  
  return NextResponse.json({
    message: 'Groups have been unified with roles. Please use the /api/roles endpoint.',
    newEndpoint: url.toString()
  });
}
