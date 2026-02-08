'use client';

import { useMemo, useRef, useEffect, useState } from 'react';
import { GoogleMap, LoadScript, Polygon, InfoWindow, useJsApiLoader } from '@react-google-maps/api';

interface Farm {
  id: string;
  coordinates?: number[][]; // [lng, lat]
  coordinatesLatLng?: { lat: number; lng: number }[];
  crop?: string;
  status?: string;
  farmerName?: string;
  state?: string;
  lga?: string;
  [key: string]: any;
}

interface GoogleMapPolygonsProps {
  center?: { lat: number; lng: number };
  farms: Farm[];
  loading?: boolean;
  onReload?: () => void;
  onBack?: () => void;
  onFarmSelect?: (farm: Farm | null) => void;
}

const containerStyle = { width: '100%', height: '100%' };

function colorForFarm(farm: Farm) {
  if (farm.status === 'verified') return '#10B981';
  if (farm.status === 'pending') return '#F59E0B';
  if (farm.crop) {
    switch ((farm.crop || '').toLowerCase()) {
      case 'rice': return '#3B82F6';
      case 'maize': return '#EF4444';
      case 'cassava': return '#EC4899';
      case 'wheat': return '#8B5CF6';
      case 'beans': return '#F97316';
      case 'yam': return '#14B8A6';
      default: return '#6B7280';
    }
  }
  return '#6B7280';
}

export default function GoogleMapPolygons({ center, farms, loading, onReload, onBack, onFarmSelect, analysisTileUrl, analysisStats }: GoogleMapPolygonsProps & { analysisTileUrl?: string | null, analysisStats?: any }) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const overlayRef = useRef<google.maps.ImageMapType | null>(null);
  const [selectedFarm, setSelectedFarm] = useState<Farm | null>(null);
  const [infoWindowPosition, setInfoWindowPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [authError, setAuthError] = useState(false);

  useEffect(() => {
      const originalFailure = (window as any).gm_authFailure;
      (window as any).gm_authFailure = () => {
          console.error("Google Maps Authentication Error: BillingNotEnabled or InvalidKey");
          setAuthError(true);
          if (originalFailure) originalFailure();
      };
      
      return () => {
          (window as any).gm_authFailure = originalFailure;
      }
  }, []);

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''
  });

  const polygons = useMemo(() => {
    return (farms || [])
      .map(farm => {
        let coordinates: { lat: number; lng: number }[] = [];

        if (Array.isArray(farm.coordinatesLatLng) && farm.coordinatesLatLng.length >= 3) {
          coordinates = farm.coordinatesLatLng;
        } else if (Array.isArray(farm.coordinates) && farm.coordinates.length >= 3) {
          coordinates = farm.coordinates.map((coord: any) => {
            if (Array.isArray(coord) && coord.length >= 2) {
              return { lat: coord[1], lng: coord[0] };
            }
            return { lat: 0, lng: 0 };
          });
        }

        if (!Array.isArray(coordinates) || coordinates.length < 3) return { farm, path: [] };

        return {
          farm,
          path: coordinates,
          options: {
            fillColor: colorForFarm(farm),
            fillOpacity: 0.4,
            strokeColor: colorForFarm(farm),
            strokeOpacity: 1,
            strokeWeight: 2,
          }
        };
      })
      .filter(p => p.path.length > 0);
  }, [farms]);

  const onLoad = (map: google.maps.Map) => {
    mapRef.current = map;
    fitBounds(map);
  };

  const fitBounds = (map: google.maps.Map) => {
    if (polygons.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    polygons.forEach(p => {
      p.path.forEach(coord => bounds.extend(coord));
    });
    map.fitBounds(bounds);
  };

  // Handle Analysis Overlay
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear existing overlay
    if (overlayRef.current) {
      map.overlayMapTypes.removeAt(0);
      overlayRef.current = null;
    }

    // Add new overlay if URL exists
    if (analysisTileUrl) {
      const layer = new google.maps.ImageMapType({
        getTileUrl: (coord, zoom) => {
          return analysisTileUrl
            .replace('{x}', coord.x.toString())
            .replace('{y}', coord.y.toString())
            .replace('{z}', zoom.toString());
        },
        tileSize: new google.maps.Size(256, 256),
        opacity: 0.7,
        name: 'Analysis Layer'
      });

      map.overlayMapTypes.insertAt(0, layer);
      overlayRef.current = layer;
    }
  }, [analysisTileUrl]);

  useEffect(() => {
    if (mapRef.current) {
      fitBounds(mapRef.current);
    }
  }, [polygons]);

  if (loadError) {
    return <div className="h-full w-full flex items-center justify-center bg-red-50 text-red-600 p-4">
      Map Error: {loadError.message}
    </div>;
  }

  if (authError) {
    return (
        <div className="h-full w-full flex flex-col items-center justify-center bg-gray-50 p-6 text-center z-50 absolute top-0 left-0">
             <div className="max-w-md bg-white p-6 rounded-xl shadow-2xl border border-red-100">
                <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">💳</span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Google Maps Billing Required</h3>
                <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                   The Google Maps Platform API requires an active billing account, even for the free tier. 
                   <br/>Error code: <code>BillingNotEnabledMapError</code>
                </p>
                <a
                  href="https://console.cloud.google.com/projectselector2/billing/enable"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Enable Billing in Cloud Console
                  <svg className="ml-2 -mr-1 w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
                </a>
             </div>
        </div>
    );
  }

  if (!isLoaded) {
    return <div className="h-full w-full flex items-center justify-center bg-gray-100">Loading Maps...</div>;
  }

  return (
    <div className="relative w-full h-full">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center || { lat: 9.0820, lng: 8.6753 }}
        zoom={6}
        onLoad={onLoad}
        options={{
          mapTypeId: 'hybrid',
          streetViewControl: false,
          mapTypeControl: true,
        }}
      >
        {polygons.map((polygon) => (
          <Polygon
            key={polygon.farm.id}
            paths={polygon.path}
            options={polygon.options}
            onClick={(e) => {
              setSelectedFarm(polygon.farm);
              if (onFarmSelect) onFarmSelect(polygon.farm);
              if (e.latLng) {
                setInfoWindowPosition({ lat: e.latLng.lat(), lng: e.latLng.lng() });
              }
            }}
          />
        ))}

        {selectedFarm && infoWindowPosition && (
          <InfoWindow
            position={infoWindowPosition}
            onCloseClick={() => {
              setSelectedFarm(null);
              if (onFarmSelect) onFarmSelect(null);
              setInfoWindowPosition(null);
            }}
          >
            <div className="p-3 w-64">
              <h3 className="font-bold text-sm mb-1">{selectedFarm.farmerName || 'Unknown Farmer'}</h3>
              <div className="space-y-1 text-xs text-gray-600">
                <p><strong>Crop:</strong> {selectedFarm.crop || 'N/A'}</p>
                <p><strong>Size:</strong> {selectedFarm.farmSize || 'N/A'} Ha</p>
                <p><strong>Location:</strong> {selectedFarm.lga}, {selectedFarm.state}</p>
                {analysisStats && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <p className="font-semibold text-blue-700 mb-1">Analysis Results:</p>
                    <div className="grid grid-cols-2 gap-1">
                      {Object.entries(analysisStats).map(([key, value]) => (
                        <div key={key}>
                          <span className="capitalize text-gray-500">{key}:</span> <span className="font-medium text-gray-900">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>

      {loading && (
        <div className="absolute top-0 left-0 w-full h-full bg-white bg-opacity-50 flex items-center justify-center z-10">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-2"></div>
            <span className="text-sm font-semibold text-green-800">Processing...</span>
          </div>
        </div>
      )}
    </div>
  );
}
