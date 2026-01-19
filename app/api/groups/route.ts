import { NextRequest, NextResponse } from 'next/server';


export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.clone();
  url.pathname = '/api/roles';
  return NextResponse.redirect(url);
}

export async function POST(req: NextRequest) {
  const url = req.nextUrl.clone();
  url.pathname = '/api/roles';

  return NextResponse.json({
    message: 'Groups have been unified with roles. Please use the /api/roles endpoint to create roles.',
    newEndpoint: url.toString(),
    migration: {
      note: 'Groups and roles are now the same concept. Use the roles API for all role management.',
      example: {
        createRole: 'POST /api/roles',
        getRoles: 'GET /api/roles'
      }
    }
  });
}
