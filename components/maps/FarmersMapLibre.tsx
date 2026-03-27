'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FarmerProperties {
  id: string;
  name?: string;
  state?: string;
  lga?: string;
  ward?: string;
  status?: string;
  phone?: string;
  farmCount?: number;
  registrationDate?: string;
  [key: string]: any;
}

export interface FarmersMapLibreProps {
  geoJson: GeoJSON.FeatureCollection | null;
  loading?: boolean;
}

const DOT_COLOR = '#10B981';

const EMPTY_FC: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };

// ─── Component ────────────────────────────────────────────────────────────────

export default function FarmersMapLibre({
  geoJson,
  loading,
}: FarmersMapLibreProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<any>(null);
  const popupRef     = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);

  // ── 1. Init map ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current) return;
    let cancelled = false;

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
        center:    [8.6753, 9.082],
        zoom:      5.5,
        maxZoom:   18,
        attributionControl: true,
        style: {
          version: 8,
          glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
          sources: {
            basemap: {
              type:        'raster',
              tiles:       ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
              tileSize:    256,
              maxzoom:     17,
              attribution: 'Tiles &copy; Esri',
            },
            farmers: {
              type:            'geojson',
              data:            EMPTY_FC,
              cluster:         true,
              clusterMaxZoom:  12,
              clusterRadius:   50,
            },
          },
          layers: [
            { id: 'basemap-layer', type: 'raster', source: 'basemap' },

            // ── Cluster circles ──
            {
              id:   'farmers-clusters',
              type: 'circle',
              source: 'farmers',
              filter: ['has', 'point_count'],
              paint: {
                'circle-color':        DOT_COLOR,
                'circle-radius':       ['step', ['get', 'point_count'], 18, 10, 26, 50, 34],
                'circle-stroke-color': 'rgba(255,255,255,0.5)',
                'circle-stroke-width': 2,
                'circle-opacity':      0.85,
              },
            },

            // ── Cluster count labels ──
            {
              id:     'farmers-cluster-count',
              type:   'symbol',
              source: 'farmers',
              filter: ['has', 'point_count'],
              layout: {
                'text-field':  '{point_count_abbreviated}',
                'text-font':   ['Open Sans Bold', 'Arial Unicode MS Bold'],
                'text-size':   13,
              },
              paint: {
                'text-color': '#ffffff',
                'text-halo-color': 'rgba(0,0,0,0.3)',
                'text-halo-width': 1,
              },
            },

            // ── Individual farmer dots ──
            {
              id:     'farmers-points',
              type:   'circle',
              source: 'farmers',
              filter: ['!', ['has', 'point_count']],
              paint: {
                'circle-color':        DOT_COLOR,
                'circle-radius':       ['interpolate', ['linear'], ['zoom'], 8, 5, 14, 9],
                'circle-stroke-color': 'rgba(255,255,255,0.8)',
                'circle-stroke-width': 1.5,
                'circle-opacity':      0.9,
              },
            },
          ],
        },
      });

      mapRef.current = map;

      popupRef.current = new ML.Popup({
        closeButton: true,
        closeOnClick: false,
        maxWidth: '260px',
        className: 'farmers-popup',
      });

      // ── Cluster click: zoom in ──
      map.on('click', 'farmers-clusters', (e: any) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ['farmers-clusters'] });
        if (!features.length) return;
        const clusterId = features[0].properties?.cluster_id;
        (map.getSource('farmers') as any).getClusterExpansionZoom(clusterId, (err: any, zoom: number) => {
          if (err) return;
          map.easeTo({ center: (features[0].geometry as any).coordinates, zoom });
        });
      });

      // ── Individual farmer click: popup ──
      map.on('click', 'farmers-points', (e: any) => {
        const p = e.features?.[0]?.properties as FarmerProperties | undefined;
        if (!p) return;

        const regDate = p.registrationDate
          ? new Date(p.registrationDate).toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' })
          : 'N/A';
        const location = [p.lga, p.state].filter(Boolean).join(', ') || 'N/A';

        popupRef.current
          .setLngLat(e.lngLat)
          .setHTML(
            `<div style="font-family:system-ui,sans-serif;font-size:13px;line-height:1.65">
              <div style="font-weight:700;font-size:14px;margin-bottom:6px">${p.name ?? 'Unknown Farmer'}</div>
              <div style="display:grid;grid-template-columns:auto 1fr;gap:2px 10px;color:#374151">
                <span style="color:#9CA3AF">Location</span><span>${location}</span>
                <span style="color:#9CA3AF">Ward</span><span>${p.ward ?? 'N/A'}</span>
                <span style="color:#9CA3AF">Farms</span><span>${p.farmCount ?? 0}</span>
                ${p.phone ? `<span style="color:#9CA3AF">Phone</span><span>${p.phone}</span>` : ''}
                <span style="color:#9CA3AF">Registered</span><span>${regDate}</span>
              </div>
            </div>`
          )
          .addTo(map);
      });

      // ── Cursor changes ──
      map.on('mouseenter', 'farmers-clusters', () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'farmers-clusters', () => { map.getCanvas().style.cursor = ''; });
      map.on('mouseenter', 'farmers-points',   () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'farmers-points',   () => { map.getCanvas().style.cursor = ''; });

      // Close popup on map click (not on feature)
      map.on('click', (e: any) => {
        const hits = map.queryRenderedFeatures(e.point, { layers: ['farmers-clusters', 'farmers-points'] });
        if (!hits.length) popupRef.current?.remove();
      });

      map.on('load', () => {
        if (cancelled) { map.remove(); mapRef.current = null; return; }
        setMapReady(true);
      });
    });

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        setMapReady(false);
      }
    };
  }, []);

  // ── 2. Update GeoJSON data ─────────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const src = mapRef.current.getSource('farmers') as any;
    if (src) src.setData(geoJson ?? EMPTY_FC);
  }, [geoJson, mapReady]);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* Loading overlay */}
      {loading && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            background: 'rgba(255,255,255,0.95)', borderRadius: 12, padding: '14px 24px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
            display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, color: '#111827',
          }}>
            <div style={{
              width: 18, height: 18, border: '2.5px solid #3B82F6',
              borderTopColor: 'transparent', borderRadius: '50%',
              animation: 'fml-spin 0.7s linear infinite',
            }} />
            Loading farmers…
          </div>
        </div>
      )}

      <style>{`
        @keyframes fml-spin { to { transform: rotate(360deg); } }
        .farmers-popup .maplibregl-popup-content {
          border-radius: 10px !important;
          box-shadow: 0 8px 32px rgba(0,0,0,0.2) !important;
          padding: 14px 16px !important;
          font-family: system-ui, sans-serif;
        }
        .maplibregl-ctrl-attrib { font-size: 10px !important; }
      `}</style>
    </div>
  );
}
