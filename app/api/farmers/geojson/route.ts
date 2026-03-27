import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
import { PERMISSIONS } from '@/lib/permissions';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userPermissions = (session.user as any).permissions as string[] | undefined;
  if (!userPermissions?.includes(PERMISSIONS.FARMERS_READ)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 5000;

    // Only fetch farmers with valid Nigerian coordinates
    const farmers = await prisma.farmer.findMany({
      where: {
        latitude:  { gte: 3,   lte: 15 },
        longitude: { gte: 2,   lte: 15.5 },
      },
      ...(limit > 0 ? { take: limit } : {}),
      select: {
        id:               true,
        firstName:        true,
        middleName:       true,
        lastName:         true,
        state:            true,
        lga:              true,
        ward:             true,
        status:           true,
        phone:            true,
        latitude:         true,
        longitude:        true,
        registrationDate: true,
        _count: { select: { farms: true } },
      },
      orderBy: { registrationDate: 'desc' },
    });

    const features: GeoJSON.Feature[] = farmers.map((f) => ({
      type: 'Feature',
      geometry: {
        type:        'Point',
        coordinates: [f.longitude!, f.latitude!],
      },
      properties: {
        id:               f.id,
        name:             [f.firstName, f.middleName, f.lastName].filter(Boolean).join(' '),
        state:            f.state ?? '',
        lga:              f.lga ?? '',
        ward:             f.ward ?? '',
        status:           f.status ?? 'Enrolled',
        phone:            f.phone ?? '',
        farmCount:        f._count.farms,
        registrationDate: f.registrationDate?.toISOString() ?? null,
      },
    }));

    const geoJson: GeoJSON.FeatureCollection = {
      type:     'FeatureCollection',
      features,
    };

    return NextResponse.json({ success: true, geoJson, total: features.length });
  } catch (error: any) {
    console.error('Farmers GeoJSON error:', error);
    return NextResponse.json(
      { success: false, error: error.message ?? 'Internal server error' },
      { status: 500 }
    );
  }
}
