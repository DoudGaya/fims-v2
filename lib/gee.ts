import { promises as fs } from 'fs';
import path from 'path';
import ee from '@google/earthengine';

// Singleton to track initialization
let isInitialized = false;

// This function securely retrieves the GEE private key.
export async function getPrivateKey() {
    if (process.env.GEE_PRIVATE_KEY_JSON) {
        try {
            return JSON.parse(process.env.GEE_PRIVATE_KEY_JSON);
        } catch (e) {
            console.error("Failed to parse GEE_PRIVATE_KEY_JSON from environment variable.");
            throw new Error("Invalid GEE private key format in environment variable.");
        }
    } else {
        try {
            const keyPath = path.join(process.cwd(), 'private-key.json');
            const keyFile = await fs.readFile(keyPath, 'utf8');
            return JSON.parse(keyFile);
        } catch (e) {
            console.warn("Could not find 'private-key.json' and GEE_PRIVATE_KEY_JSON is not set.");
            return null;
        }
    }
}

export const initGEE = async () => {
    if (isInitialized) return;

    try {
        const key = await getPrivateKey();
        if (!key) {
            console.warn("Skipping GEE initialization: No credentials found.");
            return;
        }

        return new Promise<void>((resolve, reject) => {
            ee.data.authenticateViaPrivateKey(
                key,
                () => {
                    ee.initialize(
                        null,
                        null,
                        () => {
                            isInitialized = true;
                            console.log('Google Earth Engine Initialized');
                            resolve();
                        },
                        (err: any) => reject(err)
                    );
                },
                (err: any) => reject(err)
            );
        });
    } catch (error) {
        console.error("GEE Init Failed:", error);
        throw error;
    }
};

// --- Analysis Functions (Stubs for now, ready for GEE logic) ---

export const analyzeWeather = async (geometry: any, dateRange?: string) => {
    // In production: Use ee.ImageCollection('ECMWF/ERA5/DAILY') or similar
    return {
        temperature: 28.5 + (Math.random() * 5 - 2.5),
        humidity: 60 + Math.floor(Math.random() * 20),
        rainfall: Math.random() > 0.7 ? 12.0 : 0,
        windSpeed: 4.5,
        condition: Math.random() > 0.5 ? 'Sunny' : 'Cloudy',
        source: 'Simulated Data (GEE Proxy)'
    };
};

export const analyzeSoilPH = async (geometry: any) => {
    // In production: Use OpenLandMap
    const ph = 6.0 + Math.random() * 1.5;
    return {
        ph: parseFloat(ph.toFixed(2)),
        classification: ph < 6 ? 'Acidic' : ph > 7.5 ? 'Alkaline' : 'Neutral',
        optimalFor: ['Maize', 'Cassava'] // Dynamic based on pH
    };
};

export const analyzeSoilMoisture = async (geometry: any) => {
    // In production: Use SMAP
    return {
        surface_moisture: parseFloat(Math.random().toFixed(2)), // 0-1
        root_zone_moisture: parseFloat((Math.random() * 0.5 + 0.1).toFixed(2)),
        status: Math.random() > 0.4 ? 'Adequate' : 'Dry'
    };
};

export const analyzeNDVI = async (geometry: any, dateRange: string) => {
    // In production: Use Sentinel-2
    return {
        average: 0.6 + Math.random() * 0.3,
        max: 0.9,
        min: 0.3,
        health: 'Vigorous',
        timeseries: [
            { date: '2023-01', value: 0.4 },
            { date: '2023-03', value: 0.6 },
            { date: '2023-06', value: 0.8 },
        ]
    };
};

