import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('🗺️ Loading farm GeoJSON data...');

    const farms = await prisma.farm.findMany({
      include: {
        farmer: {
          select: {
            id: true,
            firstName: true,
            middleName: true,
            lastName: true,
            state: true,
            lga: true,
            ward: true,
            status: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`📊 Found ${farms.length} farms`);

    // Helpers
    const toNumberPair = (p: any) => Array.isArray(p) && p.length >= 2 ? [Number(p[0]), Number(p[1])] : null;
    const clampPairs = (arr: any) => (Array.isArray(arr) ? arr.map(toNumberPair).filter((p): p is number[] => p !== null) : []);
    const ensureClosed = (arr: number[][]) => {
      if (!arr.length) return arr;
      const first = arr[0];
      const last = arr[arr.length - 1];
      if (first[0] === last[0] && first[1] === last[1]) return arr;
      return [...arr, first];
    };

    const nigeriaBBox = { latMin: 3, latMax: 15, lngMin: 2, lngMax: 15.5 };
    const inNigeria = ([lng, lat]: number[]) => lat >= nigeriaBBox.latMin && lat <= nigeriaBBox.latMax && lng >= nigeriaBBox.lngMin && lng <= nigeriaBBox.lngMax;

    // Transform farms
    const transformedFarms = farms.map(farm => {
      let raw: any[] = [];

      // Parse coordinates
      if (farm.farmCoordinates || farm.farmPolygon) {
        try {
          const coordinateData = farm.farmCoordinates || farm.farmPolygon;
          let parsed: any = coordinateData;

          if (typeof coordinateData === 'string') {
            parsed = JSON.parse(coordinateData);
          }

          if (Array.isArray(parsed)) {
            if (Array.isArray(parsed[0]) && Array.isArray(parsed[0][0])) {
              raw = parsed[0]; // Take first ring
            } else {
              raw = parsed;
            }
          } else if (parsed && typeof parsed === 'object') {
            const coords = (parsed as any).coordinates || (parsed as any).geometry?.coordinates;
            if (Array.isArray(coords)) {
              raw = Array.isArray(coords[0]) && Array.isArray(coords[0][0]) ? coords[0] : coords;
            }
          }
        } catch (error) {
          console.warn(`⚠️ Failed to parse coordinates for farm ${farm.id}:`, error);
          raw = [];
        }
      }

      // Fallback small square if point exists
      if (raw.length === 0 && farm.farmLatitude && farm.farmLongitude) {
        const lat = Number(farm.farmLatitude);
        const lng = Number(farm.farmLongitude);
        const offset = 0.001;
        raw = [
          [lng - offset, lat - offset],
          [lng + offset, lat - offset],
          [lng + offset, lat + offset],
          [lng - offset, lat + offset],
          [lng - offset, lat - offset],
        ];
      }

      // Normalize
      let coordsLngLat = ensureClosed(clampPairs(raw));

      // Swap check logic
      const hitsAsLngLat = coordsLngLat.filter(inNigeria).length;
      const swapped = ensureClosed(coordsLngLat.map(([lng, lat]) => [lat, lng]));
      const hitsAsSwapped = swapped.filter(inNigeria).length;

      if (hitsAsSwapped > hitsAsLngLat) {
        coordsLngLat = swapped;
      }

      const coordsLatLng = coordsLngLat.map(([lng, lat]) => [lat, lng]);

      return {
        id: farm.id,
        name: `${farm.farmer?.firstName || 'Unknown'}'s Farm`,
        farmerName: farm.farmer ?
          `${farm.farmer.firstName} ${farm.farmer.middleName || ''} ${farm.farmer.lastName}`.trim() :
          'Unknown',
        farmerId: farm.farmerId,
        crop: farm.primaryCrop,
        area: farm.farmSize || farm.farmArea,
        coordinates: coordsLngLat,
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
        // Metadata
        coordinatesCount: coordsLngLat.length,
        hasValidCoordinates: coordsLngLat.length >= 3,
      };
    });

    const validFarms = transformedFarms.filter(farm => farm.hasValidCoordinates);
    const invalidFarms = transformedFarms.filter(farm => !farm.hasValidCoordinates);

    console.log(`✅ ${validFarms.length} farms with valid coordinates`);

    // Statistics
    const totalArea = validFarms.reduce((sum, farm) => sum + (Number(farm.area) || 0), 0);
    const verifiedFarms = validFarms.filter(farm => farm.status === 'verified').length;
    const pendingFarms = validFarms.filter(farm => farm.status === 'pending').length;

    const cropStats = validFarms.reduce((acc: Record<string, number>, farm) => {
      const crop = (farm.crop as string) || 'Unknown';
      acc[crop] = (acc[crop] || 0) + 1;
      return acc;
    }, {});

    // GeoJSON FeatureCollection
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
          createdAt: farm.createdAt,
          updatedAt: farm.updatedAt,
        },
        geometry: {
          type: 'Polygon',
          coordinates: [farm.coordinates] // [lng,lat]
        }
      }))
    };

    return NextResponse.json({
      success: true,
      farms: validFarms,
      geoJson: geoJsonFeatureCollection,
      statistics: {
        total: validFarms.length,
        verified: verifiedFarms,
        pending: pendingFarms,
        totalArea: totalArea,
        cropStats: cropStats,
        invalidCoordinates: invalidFarms.length
      },
      metadata: {
        timestamp: new Date().toISOString(),
        totalFarmsInDb: farms.length,
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
