import { NextRequest, NextResponse } from 'next/server';
import ee from '@google/earthengine';
import { getPrivateKey } from '@/lib/gee';

// Function to initialize Google Earth Engine
async function initializeEE() {
    const privateKey = await getPrivateKey();
    return new Promise((resolve, reject) => {
        ee.data.authenticateViaPrivateKey(
            privateKey,
            () => {
                console.log('GEE Authentication successful.');
                ee.initialize(
                    null,
                    null,
                    () => {
                        console.log('GEE Initialized.');
                        resolve(true);
                    },
                    (err: any) => {
                        console.error('GEE initialization error:', err);
                        reject(new Error('Failed to initialize GEE.'));
                    }
                );
            },
            (err: any) => {
                console.error('GEE authentication error:', err);
                reject(new Error('Failed to authenticate with GEE.'));
            }
        );
    });
}

// Initialize GEE once and reuse the promise
const eeInitialized = initializeEE();

export async function POST(req: NextRequest) {
    try {
        // Wait for GEE to be initialized with timeout
        await Promise.race([
            eeInitialized,
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('GEE initialization timeout')), 10000)
            )
        ]);
    } catch (error: any) {
        console.error('GEE initialization failed:', error);
        return NextResponse.json({ 
            error: 'Failed to initialize GEE. Please check your credentials.',
            details: error.message 
        }, { status: 500 });
    }

    try {
        const { polygon, type, dateRange } = await req.json();

        if (!polygon || !type || !dateRange) {
            return NextResponse.json({ error: 'Missing required parameters: polygon, type, and dateRange are required.' }, { status: 400 });
        }

        const region = ee.Geometry.Polygon(polygon);

        let dataset: any;
        let visParams: any;
        let reducer = ee.Reducer.mean();
        let scale = 10; // Default scale, will be updated per dataset

        switch (type) {
            case 'NDVI':
                const s2 = ee.ImageCollection('COPERNICUS/S2_SR');
                dataset = s2.filterBounds(region)
                            .filterDate(dateRange.start, dateRange.end)
                            .median()
                            .normalizedDifference(['B8', 'B4'])
                            .rename('NDVI');
                visParams = { min: 0, max: 1, palette: ['red', 'yellow', 'green'] };
                scale = 10; // 10m for Sentinel-2
                break;

            case 'SOIL_MOISTURE':
                const smap = ee.ImageCollection('NASA_USDA/HSL/SMAP10KM_soil_moisture');
                dataset = smap.filterBounds(region)
                              .filterDate(dateRange.start, dateRange.end)
                              .select('ssm')
                              .mean();
                visParams = { min: 0, max: 25, palette: ['brown', 'blue'] };
                scale = 10000; // 10km for SMAP
                break;
            
            case 'ELEVATION':
                const dem = ee.Image('USGS/SRTMGL1_003');
                dataset = dem.select('elevation');
                visParams = {min: 0, max: 4000, palette: ['#000004', '#2C105C', '#711A81', '#B63679', '#EE605E', '#FDAE78', '#FCFDBF']};
                scale = 30; // 30m for SRTM
                break;

            case 'PRECIPITATION':
                // CHIRPS Daily: https://developers.google.com/earth-engine/datasets/catalog/UCSB-CHG_CHIRPS_DAILY
                const chirps = ee.ImageCollection('UCSB-CHG/CHIRPS/DAILY');
                dataset = chirps.filterBounds(region)
                                .filterDate(dateRange.start, dateRange.end)
                                .select('precipitation')
                                .sum(); // Total rainfall over period
                visParams = { min: 0, max: 100, palette: ['white', 'blue', 'darkblue'] };
                scale = 5566; // ~5km
                break;

            case 'EVAPOTRANSPIRATION':
                 // MODIS ET: https://developers.google.com/earth-engine/datasets/catalog/MODIS_006_MOD16A2
                 const mod16 = ee.ImageCollection('MODIS/006/MOD16A2');
                 dataset = mod16.filterBounds(region)
                                .filterDate(dateRange.start, dateRange.end)
                                .select('ET')
                                .mean();
                 visParams = { min: 0, max: 60, palette: ['#f5e4a9', '#fff4ad', '#c3e697', '#69b058', '#2a7c39'] };
                 scale = 500;
                 break;

            case 'LAND_SURFACE_TEMP':
                 // MODIS LST: https://developers.google.com/earth-engine/datasets/catalog/MODIS_006_MOD11A1
                 const mod11 = ee.ImageCollection('MODIS/006/MOD11A1');
                 dataset = mod11.filterBounds(region)
                                .filterDate(dateRange.start, dateRange.end)
                                .select('LST_Day_1km')
                                .mean()
                                .multiply(0.02) // Scale factor
                                .subtract(273.15); // Kelvin to Celsius
                 visParams = { min: 10, max: 45, palette: ['blue', 'yellow', 'red'] };
                 scale = 1000;
                 break;

            default:
                return NextResponse.json({ error: 'Invalid analysis type specified.' }, { status: 400 });
        }

        // Asynchronously get stats and mapId with timeout
        const statsPromise = dataset.reduceRegion({
            reducer: reducer,
            geometry: region,
            scale: scale,
            maxPixels: 1e9
        }).getInfo();

        const mapIdPromise = dataset.getMap(visParams);

        const [stats, mapId] = await Promise.race([
            Promise.all([statsPromise, mapIdPromise]),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Analysis timeout')), 30000)
            )
        ]) as [any, any];

        return NextResponse.json({
            success: true,
            data: {
                stats: stats,
                tileUrl: mapId.urlFormat,
            }
        });

    } catch (error: any) {
        console.error('Error in GEE analysis:', error);
        return NextResponse.json({ error: 'An error occurred during GEE analysis.', details: error.message }, { status: 500 });
    }
}

