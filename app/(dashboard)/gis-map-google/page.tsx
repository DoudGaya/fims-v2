'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

// Load Google Maps JS API on client only
const GoogleMapPolygons = dynamic(() => import('@/components/maps/GoogleMapPolygons'), { ssr: false });

const ANALYSIS_OPTIONS = [
  { id: 'NDVI', name: 'Vegetation Health (NDVI)', icon: '🌱' },
  { id: 'SOIL_MOISTURE', name: 'Soil Moisture', icon: '💧' },
  { id: 'PRECIPITATION', name: 'Precipitation', icon: '🌧️' },
  { id: 'ELEVATION', name: 'Elevation (DEM)', icon: '⛰️' },
];

export default function GISMapGoogle() {
  const router = useRouter();
  const { data: session } = useSession();
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleLayerChange = async (layerId: string) => {
    if (activeLayer === layerId) {
      // Toggle off
      setActiveLayer(null);
      setAnalysisStats(null);
      setAnalysisTileUrl(null);
      return;
    }

    setActiveLayer(layerId);
    setAnalysisLoading(true);

    try {
      // In a real app, we'd pass the specific farm polygon or viewport bounds.
      // For this demo, we mock analyzing the "current view" or "selected region".
      const response = await fetch('/api/gis/analyze', {
        method: 'POST',
        body: JSON.stringify({
          polygon: [], // Mocking "whole viewport"
          type: layerId
        })
      });

      const result = await response.json();

      if (result.success) {
        setAnalysisStats(result.data.stats);
        setAnalysisTileUrl(result.data.tileUrl);
      } else {
        console.error(result.error);
      }
    } catch (err) {
      console.error("GIS Analysis failed", err);
    } finally {
      setAnalysisLoading(false);
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
            <p className="text-xs font-bold text-blue-800 uppercase mb-1">Regional Avg - {activeLayer}</p>
            <div className="flex items-end justify-between">
              <span className="text-2xl font-bold text-blue-900">
                {analysisStats.mean || analysisStats.total}
                <span className="text-xs font-normal text-blue-600 ml-1">{analysisStats.unit}</span>
              </span>
            </div>
          </div>
        )}

        <button
          onClick={loadData}
          className="mt-4 w-full text-xs text-gray-500 hover:text-gray-900 underline"
        >
          Reload Farm Data
        </button>
      </div>

      <GoogleMapPolygons
        center={center}
        farms={farms}
        loading={loading || analysisLoading}
        onReload={loadData}
        onBack={handleBack}
        analysisTileUrl={analysisTileUrl}
        analysisStats={analysisStats}
      />
    </div>
  );
}
