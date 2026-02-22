import { NextRequest, NextResponse } from 'next/server';

// ─── Open-Meteo endpoints (free, no API key) ─────────────────────────────────
const OPEN_METEO_FORECAST  = 'https://api.open-meteo.com/v1/forecast';
const OPEN_METEO_ARCHIVE   = 'https://archive-api.open-meteo.com/v1/archive';
const OPEN_METEO_ELEVATION = 'https://api.open-meteo.com/v1/elevation';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Extract center {lat, lon} from a GeoJSON-style polygon [[[lng, lat], ...]] */
function getCenterPoint(polygon: any): { lat: number; lon: number } {
  const ring: number[][] = Array.isArray(polygon[0][0]) ? polygon[0] : (polygon as number[][]);
  let lat = 0, lon = 0;
  ring.forEach(([lng, la]: number[]) => { lon += lng; lat += la; });
  return { lat: lat / ring.length, lon: lon / ring.length };
}

function numAvg(arr: number[]): number {
  const v = arr.filter((x) => x != null && !isNaN(x));
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
}

/** Archive API requires dates in the past; cap to 2 days ago */
function capDate(d: string): string {
  const cap = new Date(Date.now() - 2 * 86_400_000).toISOString().split('T')[0];
  return d < cap ? d : cap;
}

async function fetchArchive(
  lat: number, lon: number, dailyVars: string[], start: string, end: string
) {
  const safeEnd   = capDate(end);
  const safeStart = start < safeEnd ? start : capDate(new Date(Date.now() - 30 * 86_400_000).toISOString().split('T')[0]);
  const url = new URL(OPEN_METEO_ARCHIVE);
  url.searchParams.set('latitude',   lat.toString());
  url.searchParams.set('longitude',  lon.toString());
  url.searchParams.set('daily',      dailyVars.join(','));
  url.searchParams.set('start_date', safeStart);
  url.searchParams.set('end_date',   safeEnd);
  url.searchParams.set('timezone',   'auto');
  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`Open-Meteo archive (${res.status}): ${res.statusText}`);
  return res.json();
}

async function fetchForecastHourly(lat: number, lon: number, hourlyVars: string[]) {
  const url = new URL(OPEN_METEO_FORECAST);
  url.searchParams.set('latitude',      lat.toString());
  url.searchParams.set('longitude',     lon.toString());
  url.searchParams.set('hourly',        hourlyVars.join(','));
  url.searchParams.set('timezone',      'auto');
  url.searchParams.set('forecast_days', '1');
  url.searchParams.set('past_days',     '3');
  const res = await fetch(url.toString(), { next: { revalidate: 1800 } });
  if (!res.ok) throw new Error(`Open-Meteo forecast (${res.status}): ${res.statusText}`);
  return res.json();
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { polygon, type, dateRange } = await req.json();

    if (!polygon || !type) {
      return NextResponse.json(
        { error: 'Missing required parameters: polygon and type.' },
        { status: 400 }
      );
    }

    const { lat, lon } = getCenterPoint(polygon);
    const startDate = dateRange?.start ?? new Date(Date.now() - 30 * 86_400_000).toISOString().split('T')[0];
    const endDate   = dateRange?.end   ?? new Date().toISOString().split('T')[0];

    let stats: Record<string, any> = {};

    switch (type) {

      // ── NDVI: estimated from climate proxy (GEE needed for satellite NDVI) ──
      case 'NDVI': {
        const data = await fetchArchive(lat, lon,
          ['precipitation_sum', 'temperature_2m_max'],
          startDate, endDate
        );
        const precip: number[] = (data.daily?.precipitation_sum ?? []).filter((v: any) => v != null);
        const temps:  number[] = (data.daily?.temperature_2m_max ?? []).filter((v: any) => v != null);
        const totalP = precip.reduce((a, b) => a + b, 0);
        const avgT   = numAvg(temps);
        const base   = Math.min(0.85, Math.max(0.1, (totalP / (precip.length * 8 + 0.1)) * 0.45 + 0.30));
        const penalty = avgT > 38 ? 0.12 : avgT < 15 ? 0.08 : 0;
        const ndvi   = parseFloat(Math.max(0.05, base - penalty).toFixed(2));
        stats = {
          mean:   ndvi,
          min:    parseFloat(Math.max(0.05, ndvi - 0.12).toFixed(2)),
          max:    parseFloat(Math.min(0.95, ndvi + 0.12).toFixed(2)),
          unit:   'index (0–1)',
          health: ndvi > 0.65 ? 'Vigorous' : ndvi > 0.45 ? 'Moderate' : 'Sparse',
          source: 'Climate proxy via Open-Meteo',
        };
        break;
      }

      // ── Soil Moisture (ERA5 reanalysis via Open-Meteo) ────────────────────
      case 'SOIL_MOISTURE': {
        const data = await fetchForecastHourly(lat, lon, [
          'soil_moisture_0_to_1cm',
          'soil_moisture_1_to_3cm',
          'soil_moisture_3_to_9cm',
        ]);
        const valid = (key: string) =>
          (data.hourly?.[key] ?? []).filter((v: any) => v != null) as number[];
        const sm0 = valid('soil_moisture_0_to_1cm');
        const sm1 = valid('soil_moisture_1_to_3cm');
        const sm3 = valid('soil_moisture_3_to_9cm');
        const surface  = sm0[sm0.length - 1] ?? 0;
        const rootZone = sm1[sm1.length - 1] ?? 0;
        const deep     = sm3[sm3.length - 1] ?? 0;
        stats = {
          mean:     parseFloat((surface  * 100).toFixed(1)),
          surface:  parseFloat((surface  * 100).toFixed(1)),
          rootZone: parseFloat((rootZone * 100).toFixed(1)),
          deep:     parseFloat((deep     * 100).toFixed(1)),
          unit:     '%',
          status:   surface > 0.30 ? 'Adequate' : surface > 0.15 ? 'Moderate' : 'Dry',
          source:   'Open-Meteo ERA5',
        };
        break;
      }

      // ── Elevation (Copernicus DEM via Open-Meteo) ─────────────────────────
      case 'ELEVATION': {
        const url = new URL(OPEN_METEO_ELEVATION);
        url.searchParams.set('latitude',  lat.toString());
        url.searchParams.set('longitude', lon.toString());
        const res  = await fetch(url.toString());
        if (!res.ok) throw new Error('Elevation API error');
        const data = await res.json();
        stats = {
          mean:   data.elevation?.[0] ?? 0,
          unit:   'm asl',
          source: 'Open-Meteo / Copernicus DEM',
        };
        break;
      }

      // ── Precipitation (CHIRPS proxy via Open-Meteo ERA5) ──────────────────
      case 'PRECIPITATION': {
        const data = await fetchArchive(lat, lon,
          ['precipitation_sum', 'rain_sum'],
          startDate, endDate
        );
        const precip: number[] = (data.daily?.precipitation_sum ?? []).filter((v: any) => v != null);
        const total  = precip.reduce((a, b) => a + b, 0);
        stats = {
          mean:      parseFloat(numAvg(precip).toFixed(1)),
          total:     parseFloat(total.toFixed(1)),
          max:       parseFloat((Math.max(...precip, 0)).toFixed(1)),
          unit:      'mm',
          rainyDays: precip.filter(v => v > 1).length,
          days:      precip.length,
          source:    'Open-Meteo ERA5',
        };
        break;
      }

      // ── Evapotranspiration (FAO-56 ET₀ via Open-Meteo) ───────────────────
      case 'EVAPOTRANSPIRATION': {
        const data = await fetchArchive(lat, lon,
          ['et0_fao_evapotranspiration'],
          startDate, endDate
        );
        const et: number[] = (data.daily?.et0_fao_evapotranspiration ?? []).filter((v: any) => v != null);
        stats = {
          mean:   parseFloat(numAvg(et).toFixed(2)),
          total:  parseFloat(et.reduce((a, b) => a + b, 0).toFixed(1)),
          unit:   'mm/day',
          source: 'Open-Meteo FAO-56 ET₀',
        };
        break;
      }

      // ── Land Surface Temperature (ERA5 via Open-Meteo) ───────────────────
      case 'LAND_SURFACE_TEMP': {
        const data = await fetchArchive(lat, lon,
          ['temperature_2m_max', 'temperature_2m_min', 'temperature_2m_mean'],
          startDate, endDate
        );
        const tMax:  number[] = (data.daily?.temperature_2m_max  ?? []).filter((v: any) => v != null);
        const tMin:  number[] = (data.daily?.temperature_2m_min  ?? []).filter((v: any) => v != null);
        const tMean: number[] = (data.daily?.temperature_2m_mean ?? []).filter((v: any) => v != null);
        stats = {
          mean:   parseFloat(numAvg(tMean).toFixed(1)),
          max:    parseFloat((Math.max(...tMax,  -99)).toFixed(1)),
          min:    parseFloat((Math.min(...tMin,   99)).toFixed(1)),
          unit:   '°C',
          source: 'Open-Meteo ERA5',
        };
        break;
      }

      default:
        return NextResponse.json({ error: 'Invalid analysis type.' }, { status: 400 });
    }

    return NextResponse.json({ success: true, stats, data: { stats } });

  } catch (error: any) {
    console.error('GIS analysis error:', error);
    return NextResponse.json(
      { error: 'Analysis failed', details: error.message },
      { status: 500 }
    );
  }
}

