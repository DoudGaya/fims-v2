'use client';

import { useEffect, useRef } from 'react';

interface FarmPolygonMapLibreProps {
  polygonData?: any[] | null;
  latitude?: number | null;
  longitude?: number | null;
  height?: number;
}

export default function FarmPolygonMapLibre({
  polygonData,
  latitude,
  longitude,
  height = 320,
}: FarmPolygonMapLibreProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current) return;
    let cancelled = false;

    // Convert any coordinate format → [lng, lat] for MapLibre
    const toPair = (pt: any): [number, number] | null => {
      if (!pt) return null;
      if (Array.isArray(pt) && pt.length >= 2) return [Number(pt[0]), Number(pt[1])];
      const lat = pt.latitude ?? pt.lat;
      const lng = pt.longitude ?? pt.lng;
      if (lat != null && lng != null) return [Number(lng), Number(lat)];
      return null;
    };

    // Build ring — farmPolygon is [{latitude, longitude, ...}]
    // toPair interprets object fields as [lng, lat] by reading lat/lng named properties
    let ring: [number, number][] = [];
    if (polygonData && Array.isArray(polygonData)) {
      const pairs = polygonData.map(toPair).filter((p): p is [number, number] => p !== null);
      if (pairs.length >= 3) {
        ring = pairs;
        const f = ring[0], l = ring[ring.length - 1];
        if (f[0] !== l[0] || f[1] !== l[1]) ring = [...ring, f];
      }
    }
    const hasRing   = ring.length >= 3;
    const centerLng = hasRing
      ? ring.reduce((s, c) => s + c[0], 0) / ring.length
      : (longitude ?? 8.6753);
    const centerLat = hasRing
      ? ring.reduce((s, c) => s + c[1], 0) / ring.length
      : (latitude  ?? 9.082);

    if (!document.getElementById('maplibre-css')) {
      const link = document.createElement('link');
      link.id   = 'maplibre-css';
      link.rel  = 'stylesheet';
      link.href = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css';
      document.head.appendChild(link);
    }

    import('maplibre-gl').then((mod) => {
      if (cancelled || mapRef.current || !containerRef.current) return;
      const ML = (mod as any).default ?? mod;

      const map = new ML.Map({
        container: containerRef.current,
        center:    [centerLng, centerLat],
        zoom:      15,
        maxZoom:   17,
        attributionControl: false,
        style: {
          version: 8,
          sources: {
            basemap: {
              type:        'raster',
              tiles:       ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
              tileSize:    256,
              maxzoom:     17,
              attribution: 'Tiles &copy; Esri',
            },
          },
          layers: [{ id: 'basemap-layer', type: 'raster', source: 'basemap' }],
        },
      });
      mapRef.current = map;

      map.on('load', () => {
        if (cancelled) { map.remove(); mapRef.current = null; return; }

        if (hasRing) {
          map.addSource('farm-poly', {
            type: 'geojson',
            data: {
              type: 'Feature', properties: {},
              geometry: { type: 'Polygon', coordinates: [ring] },
            },
          });
          map.addLayer({ id: 'farm-fill', type: 'fill', source: 'farm-poly',
            paint: { 'fill-color': '#10B981', 'fill-opacity': 0.35 } });
          map.addLayer({ id: 'farm-outline', type: 'line', source: 'farm-poly',
            paint: { 'line-color': '#059669', 'line-width': 3, 'line-opacity': 1 } });

          let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
          for (const [lng, lat] of ring) {
            if (lng < minLng) minLng = lng; if (lng > maxLng) maxLng = lng;
            if (lat < minLat) minLat = lat; if (lat > maxLat) maxLat = lat;
          }
          map.fitBounds(
            new ML.LngLatBounds([minLng, minLat], [maxLng, maxLat]),
            { padding: 80, duration: 0, maxZoom: 16 }
          );
        } else if (latitude != null && longitude != null) {
          map.addSource('farm-point', {
            type: 'geojson',
            data: {
              type: 'Feature', properties: {},
              geometry: { type: 'Point', coordinates: [longitude, latitude] },
            },
          });
          map.addLayer({ id: 'farm-dot', type: 'circle', source: 'farm-point',
            paint: {
              'circle-color':        '#10B981',
              'circle-radius':       10,
              'circle-stroke-color': '#fff',
              'circle-stroke-width': 2,
            } });
          map.setCenter([longitude, latitude]);
          map.setZoom(15);
        }
      });
    });

    return () => {
      cancelled = true;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height, borderRadius: 8, overflow: 'hidden' }}
    />
  );
}
