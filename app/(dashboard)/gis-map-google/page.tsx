'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

// Load Leaflet Map on client only (free alternative to Google Maps)
const LeafletPolygonMap = dynamic(() => import('@/components/maps/LeafletPolygonMap'), { ssr: false });

const ANALYSIS_OPTIONS = [
  { id: 'WEATHER', name: 'Current Weather', icon: '🌤️', api: 'weather' },
  { id: 'TEMPERATURE', name: 'Temperature', icon: '🌡️', api: 'weather' },
  { id: 'PRECIPITATION', name: 'Precipitation Forecast', icon: '🌧️', api: 'weather' },
  { id: 'AIR_QUALITY', name: 'Air Quality', icon: '💨', api: 'weather' },
  { id: 'NDVI', name: 'Vegetation Health (NDVI)', icon: '🌱', api: 'gis' },
  { id: 'SOIL_MOISTURE', name: 'Soil Moisture', icon: '💧', api: 'gis' },
  { id: 'EVAPOTRANSPIRATION', name: 'Evapotranspiration', icon: '🌫️', api: 'gis' },
  { id: 'LAND_SURFACE_TEMP', name: 'Land Surface Temp', icon: '🔥', api: 'gis' },
  { id: 'ELEVATION', name: 'Elevation (DEM)', icon: '⛰️', api: 'gis' },
];

export default function GISMapGoogle() {
  const router = useRouter();
  const { data: session } = useSession();
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedFarm, setSelectedFarm] = useState<any | null>(null);

  // GIS Analysis State
  const [activeLayer, setActiveLayer] = useState<string | null>(null);
  const [analysisStats, setAnalysisStats] = useState<any>(null);
  const [analysisTileUrl, setAnalysisTileUrl] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/farms/geojson');
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Failed loading farms');
      setFarms(data.farms || []);
    } catch (e: any) {
      setError(e.message);
      setFarms([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const runAnalysis = async (layerId: string, farm: any) => {
    if (!layerId || !farm) return;

    setAnalysisLoading(true);
    setAnalysisStats(null);
    setAnalysisTileUrl(null);
    setError(null);

    try {
       // Format coordinates for analysis (GeoJSON Polygon: [[[lng, lat], ...]])
       let polygonCoords: any[] = [];
       if (farm.coordinates && Array.isArray(farm.coordinates)) {
          // Assuming stored as [[lng, lat]] or similar. Need to ensure closure.
          polygonCoords = [farm.coordinates];
       } else if (farm.coordinatesLatLng) {
          polygonCoords = [farm.coordinatesLatLng.map((c: any) => [c.lng, c.lat])];
       }

       if (!polygonCoords.length) {
         console.warn("No coordinates for farm");
         setError("No coordinates available for this farm");
         setAnalysisLoading(false);
         return;
       }

      // Determine which API to use
      const option = ANALYSIS_OPTIONS.find(opt => opt.id === layerId);
      const apiEndpoint = option?.api === 'weather' ? '/api/weather/analyze' : '/api/gis/analyze';

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          polygon: polygonCoords,
          type: layerId,
          dateRange: {
              start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Last 30 days
              end: new Date().toISOString().split('T')[0]
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Analysis failed');
      }

      const result = await response.json();

      if (result.success || result.stats || result.data) {
        setAnalysisStats(result.stats || result.data?.stats || result.data?.current);
        setAnalysisTileUrl(result.tileUrl || result.data?.tileUrl);
      } else {
        throw new Error(result.error || "Analysis failed");
      }
    } catch (err: any) {
      console.error("Analysis failed", err);
      setError(err.message || "Analysis failed to run. Try selecting another layer.");
    } finally {
      setAnalysisLoading(false);
    }
  };

  const handleLayerChange = async (layerId: string) => {
    if (activeLayer === layerId) {
      setActiveLayer(null);
      setAnalysisStats(null);
      setAnalysisTileUrl(null);
      return;
    }

    setActiveLayer(layerId);
    
    // If a farm is already selected, run analysis immediately
    if (selectedFarm) {
        runAnalysis(layerId, selectedFarm);
    }
  };

  const handleFarmSelect = (farm: any) => {
      setSelectedFarm(farm);
      if (farm && activeLayer) {
          runAnalysis(activeLayer, farm);
      } else if (!farm) {
          // Clear stats if deselected
          setAnalysisStats(null);
          setAnalysisTileUrl(null);
      }
  };


  useEffect(() => { loadData(); }, [loadData]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const center = useMemo(() => ({ lat: 9.0765, lng: 8.6753 }), []);

  return (
    <div className="h-[calc(100vh-64px)] w-full relative">
      <div className="absolute top-4 left-4 z-10 bg-white p-4 rounded-lg shadow-lg max-w-sm">
        <h1 className="text-xl font-bold mb-1">Precision Ag Platform</h1>
        <p className="text-xs text-gray-500 mb-4">Total Farms Monitored: {farms.length}</p>

        {selectedFarm ? (
           <div className="mb-4 p-2 bg-green-50 rounded border border-green-200">
               <p className="font-bold text-sm">{selectedFarm.farmerName || 'Farm Selected'}</p>
               <p className="text-xs text-gray-600">{selectedFarm.lga}, {selectedFarm.state}</p>
               {activeLayer ? (
                 <p className="text-xs text-blue-600 mt-1">Analyzing {activeLayer}...</p>
               ) : (
                 <p className="text-xs text-gray-500 mt-1">Select a layer below to analyze</p>
               )}
           </div>
        ) : (
           <p className="text-xs text-orange-600 mb-4 font-medium">Click a farm on the map to analyze</p>
        )}

        {error && <p className="text-xs text-red-500 mb-2">{error}</p>}

        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-700">Analysis Layers</h3>
          <div className="grid grid-cols-1 gap-2">
            {ANALYSIS_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => handleLayerChange(opt.id)}
                disabled={analysisLoading}
                className={`flex items-center p-2 rounded-md text-sm transition-colors ${activeLayer === opt.id
                    ? 'bg-green-100 text-green-800 border border-green-300'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-transparent'
                  }`}
              >
                <span className="mr-3 text-lg">{opt.icon}</span>
                <span className="flex-1 text-left">{opt.name}</span>
                {activeLayer === opt.id && analysisLoading && (
                  <div className="animate-spin h-4 w-4 border-2 border-green-600 rounded-full border-t-transparent"></div>
                )}
              </button>
            ))}
          </div>
        </div>

        {activeLayer && !analysisLoading && analysisStats && (
          <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-100 animate-in fade-in slide-in-from-top-2">
            <p className="text-xs font-bold text-blue-800 uppercase mb-2">{activeLayer.replace('_', ' ')}</p>
            
            {/* Weather Data Display */}
            {activeLayer === 'WEATHER' && analysisStats.temperature !== undefined && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Temperature:</span>
                  <span className="text-xl font-bold text-blue-900">{analysisStats.temperature}°C</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Humidity:</span>
                  <span className="text-lg font-semibold">{analysisStats.humidity}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Wind:</span>
                  <span className="text-sm">{analysisStats.wind_speed} m/s</span>
                </div>
                {analysisStats.description && (
                  <p className="text-xs text-gray-600 capitalize mt-2">{analysisStats.description}</p>
                )}
              </div>
            )}
            
            {/* Temperature Data */}
            {activeLayer === 'TEMPERATURE' && (
              <div className="space-y-1">
                <div className="flex items-end justify-between">
                  <span className="text-2xl font-bold text-blue-900">
                    {analysisStats.mean || analysisStats.temperature}°C
                  </span>
                </div>
                {analysisStats.min && analysisStats.max && (
                  <p className="text-xs text-gray-600">Range: {analysisStats.min}°C - {analysisStats.max}°C</p>
                )}
              </div>
            )}
            
            {/* General Stats Display */}
            {(activeLayer !== 'WEATHER' && activeLayer !== 'TEMPERATURE') && (
              <div className="flex items-end justify-between">
                <span className="text-2xl font-bold text-blue-900">
                  {analysisStats.mean || analysisStats.total || analysisStats.aqi || 'N/A'}
                  <span className="text-xs font-normal text-blue-600 ml-1">{analysisStats.unit || ''}</span>
                </span>
              </div>
            )}
          </div>
        )}

        <button
          onClick={loadData}
          className="mt-4 w-full text-xs text-gray-500 hover:text-gray-900 underline"
        >
          Reload Farm Data
        </button>
      </div>

      <LeafletPolygonMap
        center={center}
        farms={farms}
        loading={loading || analysisLoading}
        onReload={loadData}
        onBack={handleBack}
        onFarmSelect={handleFarmSelect}
        analysisTileUrl={analysisTileUrl}
        analysisStats={analysisStats}
      />
    </div>
  );
}
