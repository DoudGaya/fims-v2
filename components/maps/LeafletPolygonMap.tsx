'use client';

import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';

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

interface LeafletPolygonMapProps {
  center?: { lat: number; lng: number };
  farms: Farm[];
  loading?: boolean;
  onReload?: () => void;
  onBack?: () => void;
  onFarmSelect?: (farm: Farm | null) => void;
  analysisTileUrl?: string | null;
  analysisStats?: any;
}

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

export default function LeafletPolygonMap({
  center = { lat: 9.082, lng: 8.6753 }, // Nigeria center
  farms,
  loading,
  onReload,
  onBack,
  onFarmSelect,
  analysisTileUrl,
  analysisStats
}: LeafletPolygonMapProps) {
  const mapRef = useRef<any>(null);
  const mapInstanceRef = useRef<any>(null);
  const [selectedFarm, setSelectedFarm] = useState<Farm | null>(null);

  useEffect(() => {
    // Only load on client side
    if (typeof window === 'undefined') return;

    // Dynamically import Leaflet
    import('leaflet').then((L) => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
      }

      // Create map
      const map = L.map(mapRef.current).setView([center.lat, center.lng], 6);

      // Add OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      // Add farm polygons
      farms.forEach((farm) => {
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

        if (coordinates.length >= 3) {
          const latLngs = coordinates.map(c => [c.lat, c.lng] as [number, number]);
          const color = colorForFarm(farm);

          const polygon = L.polygon(latLngs, {
            fillColor: color,
            fillOpacity: 0.4,
            color: color,
            weight: 2,
          }).addTo(map);

          // Add popup
          const popupContent = `
            <div style="min-width: 200px;">
              <h3 style="font-weight: bold; margin-bottom: 8px;">${farm.farmerName || 'Unknown Farmer'}</h3>
              ${farm.crop ? `<p><strong>Crop:</strong> ${farm.crop}</p>` : ''}
              ${farm.state ? `<p><strong>State:</strong> ${farm.state}</p>` : ''}
              ${farm.lga ? `<p><strong>LGA:</strong> ${farm.lga}</p>` : ''}
              ${farm.status ? `<p><strong>Status:</strong> ${farm.status}</p>` : ''}
            </div>
          `;

          polygon.bindPopup(popupContent);

          polygon.on('click', () => {
            setSelectedFarm(farm);
            if (onFarmSelect) {
              onFarmSelect(farm);
            }
          });
        }
      });

      // Fit bounds to show all polygons if there are any
      if (farms.length > 0) {
        const allCoords = farms.flatMap(farm => {
          if (Array.isArray(farm.coordinatesLatLng)) {
            return farm.coordinatesLatLng;
          } else if (Array.isArray(farm.coordinates)) {
            return farm.coordinates.map(c => ({ lat: c[1], lng: c[0] }));
          }
          return [];
        }).filter(c => c.lat && c.lng);

        if (allCoords.length > 0) {
          const bounds = L.latLngBounds(allCoords.map(c => [c.lat, c.lng] as [number, number]));
          map.fitBounds(bounds, { padding: [50, 50] });
        }
      }

      mapInstanceRef.current = map;
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
      }
    };
  }, [farms, center]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Map Container */}
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

      {/* Controls */}
      <div style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        zIndex: 1000,
        display: 'flex',
        gap: '8px'
      }}>
        {onReload && (
          <button
            onClick={onReload}
            disabled={loading}
            style={{
              padding: '8px 16px',
              backgroundColor: 'white',
              border: '2px solid #ccc',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? 'Loading...' : 'Reload'}
          </button>
        )}
        {onBack && (
          <button
            onClick={onBack}
            style={{
              padding: '8px 16px',
              backgroundColor: 'white',
              border: '2px solid #ccc',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Back
          </button>
        )}
      </div>

      {/* Analysis Stats */}
      {analysisStats && (
        <div style={{
          position: 'absolute',
          bottom: '10px',
          left: '10px',
          zIndex: 1000,
          backgroundColor: 'white',
          padding: '12px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          maxWidth: '300px'
        }}>
          <h4 style={{ fontWeight: 'bold', marginBottom: '8px' }}>Analysis Results</h4>
          <pre style={{ fontSize: '12px', margin: 0 }}>{JSON.stringify(analysisStats, null, 2)}</pre>
        </div>
      )}

      {/* Legend */}
      <div style={{
        position: 'absolute',
        bottom: '10px',
        right: '10px',
        zIndex: 1000,
        backgroundColor: 'white',
        padding: '12px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
      }}>
        <h4 style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '14px' }}>Legend</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '20px', height: '20px', backgroundColor: '#10B981' }} />
            <span>Verified</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '20px', height: '20px', backgroundColor: '#F59E0B' }} />
            <span>Pending</span>
          </div>
        </div>
      </div>
    </div>
  );
}
