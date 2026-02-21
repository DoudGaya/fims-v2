import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const OPENWEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!OPENWEATHER_API_KEY) {
      return NextResponse.json({ 
        error: 'OpenWeather API key not configured',
        message: 'Please set OPENWEATHER_API_KEY in environment variables'
      }, { status: 500 });
    }

    const { polygon, type, dateRange } = await req.json();

    if (!polygon || !type) {
      return NextResponse.json({ 
        error: 'Missing required parameters: polygon and type are required.' 
      }, { status: 400 });
    }

    // Calculate center point of polygon for weather query
    const coords = polygon[0] || polygon;
    let centerLat = 0;
    let centerLon = 0;
    
    coords.forEach(([lon, lat]: [number, number]) => {
      centerLon += lon;
      centerLat += lat;
    });
    
    centerLat /= coords.length;
    centerLon /= coords.length;

    let result: any = {};

    switch (type) {
      case 'WEATHER':
      case 'TEMPERATURE':
      case 'PRECIPITATION': {
        // Current weather data
        const currentWeatherUrl = `${OPENWEATHER_BASE_URL}/weather?lat=${centerLat}&lon=${centerLon}&appid=${OPENWEATHER_API_KEY}&units=metric`;
        const currentResponse = await fetch(currentWeatherUrl);
        
        if (!currentResponse.ok) {
          throw new Error(`OpenWeather API error: ${currentResponse.statusText}`);
        }
        
        const currentData = await currentResponse.json();
        
        // 5 day forecast
        const forecastUrl = `${OPENWEATHER_BASE_URL}/forecast?lat=${centerLat}&lon=${centerLon}&appid=${OPENWEATHER_API_KEY}&units=metric`;
        const forecastResponse = await fetch(forecastUrl);
        const forecastData = forecastResponse.ok ? await forecastResponse.json() : null;

        result = {
          success: true,
          data: {
            current: {
              temperature: currentData.main.temp,
              feels_like: currentData.main.feels_like,
              humidity: currentData.main.humidity,
              pressure: currentData.main.pressure,
              wind_speed: currentData.wind.speed,
              wind_direction: currentData.wind.deg,
              clouds: currentData.clouds.all,
              description: currentData.weather[0].description,
              icon: currentData.weather[0].icon,
              rain_1h: currentData.rain?.['1h'] || 0,
              rain_3h: currentData.rain?.['3h'] || 0,
              visibility: currentData.visibility
            },
            forecast: forecastData?.list?.slice(0, 8).map((item: any) => ({
              time: item.dt_txt,
              temp: item.main.temp,
              description: item.weather[0].description,
              precipitation: item.pop * 100, // Probability of precipitation
              rain: item.rain?.['3h'] || 0
            })),
            location: {
              name: currentData.name,
              country: currentData.sys.country,
              lat: centerLat,
              lon: centerLon
            }
          },
          stats: {
            mean: currentData.main.temp,
            min: currentData.main.temp_min,
            max: currentData.main.temp_max,
            unit: type === 'PRECIPITATION' ? 'mm' : '°C',
            humidity: currentData.main.humidity
          }
        };
        break;
      }

      case 'AIR_QUALITY': {
        const airQualityUrl = `${OPENWEATHER_BASE_URL}/air_pollution?lat=${centerLat}&lon=${centerLon}&appid=${OPENWEATHER_API_KEY}`;
        const airResponse = await fetch(airQualityUrl);
        
        if (!airResponse.ok) {
          throw new Error(`Air Quality API error: ${airResponse.statusText}`);
        }
        
        const airData = await airResponse.json();
        const aqi = airData.list[0];
        
        result = {
          success: true,
          data: {
            aqi: aqi.main.aqi,
            components: aqi.components,
            timestamp: new Date(aqi.dt * 1000).toISOString()
          },
          stats: {
            mean: aqi.main.aqi,
            unit: 'AQI',
            co: aqi.components.co,
            no2: aqi.components.no2,
            o3: aqi.components.o3,
            pm2_5: aqi.components.pm2_5,
            pm10: aqi.components.pm10
          }
        };
        break;
      }

      default:
        return NextResponse.json({ 
          error: 'Invalid analysis type. Supported: WEATHER, TEMPERATURE, PRECIPITATION, AIR_QUALITY' 
        }, { status: 400 });
    }

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Error in OpenWeather analysis:', error);
    return NextResponse.json({ 
      error: 'An error occurred during weather analysis',
      details: error.message 
    }, { status: 500 });
  }
}
