import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 1000;

    console.log(`🗺️ Loading farm GeoJSON data (limit: ${limit > 0 ? limit : 'all'})...`);

    // ── Query 1: farms with polygon data (for polygon layer) ──────────────
    const farms = await prisma.farm.findMany({
      where: {
        OR: [
          { farmCoordinates: { not: Prisma.DbNull } },
          { farmPolygon:     { not: Prisma.DbNull } },
          {
            AND: [
              { farmLatitude:  { not: null } },
              { farmLongitude: { not: null } },
            ],
          },
        ],
      },
      ...(limit > 0 ? { take: limit } : {}),
      include: {
        farmer: {
          select: {
            id: true, firstName: true, middleName: true, lastName: true,
            state: true, lga: true, ward: true, status: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // ── Query 2: ALL farms with valid Nigerian lat/lng (for dot layer) ────
    // Server-side bbox filter ensures only real Nigerian coordinates come through.
    const pointFarms = await prisma.farm.findMany({
      where: {
        farmLatitude:  { gte: 3,   lte: 15   },
        farmLongitude: { gte: 2,   lte: 15.5 },
      },
      ...(limit > 0 ? { take: limit } : {}),
      select: {
        id: true,
        farmLatitude: true,
        farmLongitude: true,
        primaryCrop: true,
        farmState: true,
        farmLocalGovernment: true,
        farmSize: true,
        farmArea: true,
        farmerId: true,
        farmer: {
          select: {
            firstName: true, middleName: true, lastName: true,
            status: true, state: true, lga: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`📊 Found ${farms.length} farms for polygons, ${pointFarms.length} farms with valid Nigerian coordinates`);

    // ── Helpers ───────────────────────────────────────────────────────────────
    const nigeriaBBox = { latMin: 3, latMax: 15, lngMin: 2, lngMax: 15.5 };
    const inNigeria = ([lng, lat]: number[]) =>
      lng >= nigeriaBBox.lngMin && lng <= nigeriaBBox.lngMax &&
      lat >= nigeriaBBox.latMin && lat <= nigeriaBBox.latMax;

    const ensureClosed = (arr: number[][]) => {
      if (arr.length < 2) return arr;
      const f = arr[0]; const l = arr[arr.length - 1];
      return f[0] === l[0] && f[1] === l[1] ? arr : [...arr, f];
    };

    /** Convert any coordinate element to [lng, lat] pair, handling objects & arrays */
    const toPair = (p: any): [number, number] | null => {
      if (Array.isArray(p) && p.length >= 2) return [Number(p[0]), Number(p[1])];
      if (p && typeof p === 'object') {
        // {latitude, longitude} or {lat, lng} or {x, y}
        const lat = p.latitude ?? p.lat ?? p.y;
        const lng = p.longitude ?? p.lng ?? p.x;
        if (lat != null && lng != null) return [Number(lng), Number(lat)];
      }
      return null;
    };

    /** Extract a flat list of [lng, lat] pairs from any nested coordinate structure */
    const extractRing = (parsed: any): number[][] => {
      if (!parsed) return [];

      // Single-point object: {"latitude":x,"longitude":y}  →  build square
      if (!Array.isArray(parsed) && typeof parsed === 'object') {
        const pair = toPair(parsed);
        if (pair) return [pair]; // will be detected as single-point below
        // GeoJSON-style
        const inner = (parsed as any).coordinates ?? (parsed as any).geometry?.coordinates;
        if (inner) return extractRing(inner);
        return [];
      }

      if (!Array.isArray(parsed)) return [];
      if (parsed.length === 0) return [];

      const first = parsed[0];

      // [[ring]] — triple-nested (GeoJSON Polygon)
      if (Array.isArray(first) && Array.isArray(first[0]) && Array.isArray(first[0][0])) {
        return extractRing(first[0]);
      }
      // [ring] — double-nested
      if (Array.isArray(first) && Array.isArray(first[0])) {
        return extractRing(first);
      }
      // flat array of pairs [[lng,lat],...] or [{lat,lng},...]
      if (Array.isArray(first) || (first && typeof first === 'object')) {
        return parsed.map(toPair).filter((p): p is [number, number] => p !== null);
      }
      return [];
    };

    // Transform farms — only REAL multi-point surveyed rings are included.
    // Single-point farms (most of the DB) are served only by the pointsGeoJson dot layer.
    // farmPolygon stores [{latitude, longitude, timestamp?, accuracy?}, ...] from the mobile app.
    const transformedFarms = farms.map(farm => {
      let ring: number[][] = [];

      const stored = farm.farmPolygon || farm.farmCoordinates;
      if (stored) {
        try {
          const parsed = typeof stored === 'string' ? JSON.parse(stored) : stored;
          const pts = extractRing(parsed);
          // Require ≥3 GPS-captured points — never synthesise squares from single points
          if (pts.length >= 3) {
            ring = ensureClosed(pts);
          }
        } catch (e) {
          console.warn(`⚠️ Parse error for farm ${farm.id}:`, e);
        }
      }

      // Swap detection: use whichever axis order puts more points inside Nigeria bbox
      if (ring.length >= 3) {
        const hitsNormal  = ring.filter(inNigeria).length;
        const ringSwapped = ensureClosed(ring.map(([a, b]) => [b, a]));
        const hitsSwapped = ringSwapped.filter(inNigeria).length;
        if (hitsSwapped > hitsNormal) ring = ringSwapped;
      }

      const valid = ring.length >= 3 && ring.filter(inNigeria).length >= Math.ceil(ring.length * 0.6);
      const coordsLatLng = ring.map(([lng, lat]) => [lat, lng]);

      return {
        id: farm.id,
        name: `${farm.farmer?.firstName || 'Unknown'}'s Farm`,
        farmerName: farm.farmer
          ? `${farm.farmer.firstName} ${farm.farmer.middleName || ''} ${farm.farmer.lastName}`.trim()
          : 'Unknown',
        farmerId: farm.farmerId,
        crop: farm.primaryCrop,
        area: farm.farmSize || farm.farmArea,
        coordinates: ring,
        coordinatesLatLng: coordsLatLng,
        status: farm.farmer?.status?.toLowerCase() === 'verified' ? 'verified' : 'pending',
        state: farm.farmState || farm.farmer?.state || '',
        lga: farm.farmLocalGovernment || farm.farmer?.lga || '',
        ward: farm.farmWard || farm.farmer?.ward || '',
        createdAt: farm.createdAt,
        updatedAt: farm.updatedAt,
        secondaryCrop: farm.secondaryCrop,
        soilType: farm.soilType,
        farmingExperience: farm.farmingExperience,
        coordinatesCount: ring.length,
        hasValidCoordinates: valid,
      };
    });

    const validFarms   = transformedFarms.filter(f => f.hasValidCoordinates);
    const invalidFarms = transformedFarms.filter(f => !f.hasValidCoordinates);
    const polygonFarmIds = new Set(validFarms.map(f => f.id));

    console.log(`✅ ${validFarms.length} surveyed polygon farms, ${pointFarms.length} dot farms`);

    // ── Build Point FeatureCollection from raw lat/lng (no parsing needed) ──
    const pointsGeoJson = {
      type: 'FeatureCollection',
      features: pointFarms.map(pf => ({
        type: 'Feature',
        properties: {
          id: pf.id,
          farmerName: pf.farmer
            ? `${pf.farmer.firstName || ''} ${pf.farmer.middleName || ''} ${pf.farmer.lastName || ''}`.trim()
            : 'Unknown',
          crop:   pf.primaryCrop   || null,
          area:   pf.farmSize      || pf.farmArea || null,
          status: pf.farmer?.status?.toLowerCase() === 'verified' ? 'verified' : 'pending',
          state:  pf.farmState     || pf.farmer?.state || '',
          lga:    pf.farmLocalGovernment || pf.farmer?.lga || '',
          hasPolygon: polygonFarmIds.has(pf.id),
        },
        geometry: {
          type: 'Point',
          coordinates: [Number(pf.farmLongitude), Number(pf.farmLatitude)],
        },
      }))
    };

    // Statistics — based on pointFarms (all farms with valid Nigerian coords)
    const totalArea = validFarms.reduce((sum, farm) => sum + (Number(farm.area) || 0), 0);

    const verifiedFarms = pointFarms.filter(pf => pf.farmer?.status?.toLowerCase() === 'verified').length;
    const pendingFarms  = pointFarms.filter(pf => pf.farmer?.status?.toLowerCase() !== 'verified').length;

    const cropStats = pointFarms.reduce((acc: Record<string, number>, pf) => {
      const crop = (pf.primaryCrop as string) || 'Unknown';
      acc[crop] = (acc[crop] || 0) + 1;
      return acc;
    }, {});

    // GeoJSON — only real surveyed polygons, no synthetic squares
    const geoJsonFeatureCollection = {
      type: 'FeatureCollection',
      features: validFarms.map(farm => ({
        type: 'Feature',
        properties: {
          id: farm.id,
          name: farm.name,
          farmerName: farm.farmerName,
          farmerId: farm.farmerId,
          crop: farm.crop,
          area: farm.area,
          status: farm.status,
          state: farm.state,
          lga: farm.lga,
          ward: farm.ward,
          coordinatesCount: farm.coordinatesCount,
        },
        geometry: {
          type: 'Polygon',
          coordinates: [farm.coordinates], // [[lng,lat], ...]
        },
      }))
    };

    console.log(`🗺️ GeoJSON: ${validFarms.length} real surveyed polygons`);

    return NextResponse.json({
      success: true,
      farms: validFarms,
      geoJson: geoJsonFeatureCollection,
      pointsGeoJson,
      statistics: {
        total:      pointFarms.length,
        verified:   verifiedFarms,
        pending:    pendingFarms,
        totalArea:  totalArea,
        cropStats:  cropStats,
        invalidCoordinates: invalidFarms.length,
        surveyedPolygons:   validFarms.length,
      },
      metadata: {
        timestamp: new Date().toISOString(),
        totalFarmsInDb: await prisma.farm.count(),
        farmsWithValidCoordinates: validFarms.length,
        farmsWithInvalidCoordinates: invalidFarms.length
      }
    });

  } catch (error: any) {
    console.error('❌ Error loading farm GeoJSON data:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to load farm data',
      error: error.message
    }, { status: 500 });
  }
}
