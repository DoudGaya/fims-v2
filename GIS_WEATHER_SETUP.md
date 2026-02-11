# GIS & Weather Analysis Setup Guide

## Overview
The CCSA platform now includes comprehensive GIS and weather analysis capabilities for precision agriculture monitoring.

## Features

### 1. **OpenWeather Maps Integration** ⛅
Real-time weather data and forecasts for farm locations:
- Current temperature, humidity, wind speed
- 5-day weather forecast
- Precipitation probability
- Air quality index (AQI)

### 2. **Google Earth Engine Analysis** 🛰️
Satellite-based agricultural monitoring:
- **NDVI** - Vegetation health index
- **Soil Moisture** - NASA SMAP data
- **Elevation** - Digital Elevation Model
- **Land Surface Temperature** - MODIS data
- **Evapotranspiration** - Water usage estimation

### 3. **Enhanced Polygon Rendering** 📍
Precise farm boundary visualization:
- Exact GPS coordinate markers
- Numbered waypoints
- Scale indicators
- Distance measurements
- Interactive point display

## Setup Instructions

### 1. OpenWeather API (Recommended - Free Tier Available)

1. Visit [OpenWeatherMap.org](https://openweathermap.org/api)
2. Create a free account
3. Go to API keys section
4. Copy your API key
5. Add to `.env`:
   ```env
   OPENWEATHER_API_KEY=your_api_key_here
   ```

**Free Tier Limits:**
- 60 calls/minute
- 1,000,000 calls/month
- Perfect for most use cases

### 2. Google Maps API (Required)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable these APIs:
   - Maps JavaScript API
   - Places API (optional)
4. Create credentials (API Key)
5. Add to `.env`:
   ```env
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_maps_api_key
   ```

**Important:** Enable billing in Google Cloud (required even for free tier)

### 3. Google Earth Engine (Optional - Advanced)

1. Sign up at [Google Earth Engine](https://earthengine.google.com/)
2. Create a service account in Google Cloud Console
3. Download private key JSON
4. Add to `.env`:
   ```env
   GEE_PRIVATE_KEY_JSON='{"type":"service_account",...}'
   ```

Or save as `private-key.json` in project root.

## Usage

### Accessing GIS Dashboard
Navigate to: `/gis-map-google`

### Analyzing a Farm

1. **Select a Farm**: Click on any farm polygon on the map
2. **Choose Analysis Layer**: Select from the sidebar:
   - Weather (OpenWeather - Recommended)
   - Temperature
   - Precipitation Forecast
   - Air Quality
   - NDVI (requires GEE)
   - Soil Moisture (requires GEE)
   - Elevation
   - Evapotranspiration (requires GEE)
   - Land Surface Temperature (requires GEE)

3. **View Results**: Analysis displays in the sidebar with:
   - Real-time metrics
   - Historical trends (where applicable)
   - Color-coded map overlay

4. **Show Coordinate Points**: Click "Show Points" in farm info window

## API Endpoints

### Weather Analysis
```http
POST /api/weather/analyze
Content-Type: application/json

{
  "polygon": [[[lng, lat], ...]],
  "type": "WEATHER|TEMPERATURE|PRECIPITATION|AIR_QUALITY",
  "dateRange": {
    "start": "2024-01-01",
    "end": "2024-02-01"
  }
}
```

### GIS Analysis (Earth Engine)
```http
POST /api/gis/analyze
Content-Type: application/json

{
  "polygon": [[[lng, lat], ...]],
  "type": "NDVI|SOIL_MOISTURE|ELEVATION|...",
  "dateRange": {
    "start": "2024-01-01",
    "end": "2024-02-01"
  }
}
```

## Troubleshooting

### GIS Page Keeps Loading
**Solution:** Check if you have valid API keys set in `.env`. The page now has timeout protection (10s for initialization, 30s for analysis).

**Fallback:** Use OpenWeather APIs which don't require GEE setup.

### Google Maps Billing Error
**Error:** `BillingNotEnabledMapError`

**Solution:** 
1. Go to [Google Cloud Billing](https://console.cloud.google.com/billing)
2. Enable billing for your project
3. You'll stay within free tier for normal usage

### Polygon Not Showing
**Issue:** Farm coordinates may be in wrong format

**Check:**
- Coordinates should be `[longitude, latitude]` pairs
- Polygon should have at least 3 points
- Coordinates should be valid GPS values

### Weather Data Not Loading
**Check:**
1. `OPENWEATHER_API_KEY` is set in `.env`
2. API key is active (check [your account](https://home.openweathermap.org/api_keys))
3. Not exceeding rate limits

## Cost Estimates

### OpenWeather (Recommended)
- **Free Tier:** 1M calls/month - $0
- **Professional:** Unlimited - $40/month
- **Enterprise:** Custom pricing

### Google Maps
- **Monthly Free Credit:** $200
- **Maps JS API:** $7 per 1,000 loads
- **Typical Monthly Cost:** $0 - $50 (within free tier)

### Google Earth Engine
- **Free Tier:** 100 compute hours/month
- **Enterprise:** Contact sales

## Performance Tips

1. **Cache Results:** Analysis results are stored temporarily
2. **Batch Queries:** Analyze multiple farms in one session
3. **Use OpenWeather First:** Faster, more reliable, free
4. **GEE for Advanced Analysis:** Use when you need satellite data

## Support

For issues or questions:
1. Check console logs for detailed errors
2. Verify all environment variables are set
3. Test API keys independently
4. Contact dev team with error screenshots

## Future Enhancements

- [ ] Historical weather data comparison
- [ ] Crop yield prediction models
- [ ] Automated pest risk alerts
- [ ] Soil sampling integration
- [ ] Irrigation recommendations
- [ ] Multi-farm comparative analysis
