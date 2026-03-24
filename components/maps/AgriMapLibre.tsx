'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FarmProperties {
  id: string;
  farmerName?: string;
  name?: string;
  crop?: string;
  area?: number | string;
  status?: string;
  state?: string;
  lga?: string;
  ward?: string;
  [key: string]: any;
}

export interface AgriMapLibreProps {
  geoJson: GeoJSON.FeatureCollection | null;
  /** Pre-built Point FeatureCollection from server (lat/lng directly from DB) */
  pointsGeoJson?: GeoJSON.FeatureCollection | null;
  loading?: boolean;
  onFarmSelect?: (props: FarmProperties | null) => void;
  onDeleteFarm?: (farmId: string, farmName: string) => void;
  analysisTileUrl?: string | null;
  selectedFarmId?: string | null;
}

// ─── Basemaps ─────────────────────────────────────────────────────────────────

const BASEMAPS = [
  {
    id: 'streets',
    label: 'Streets',
    tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
    attribution: '&copy; OpenStreetMap contributors',
    tileSize: 256,
    maxzoom: 18, // OSM reliably covers to 18; MapLibre overzooms beyond that
  },
  {
    id: 'satellite',
    label: 'Satellite',
    tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
    attribution: 'Tiles &copy; Esri',
    tileSize: 256,
    maxzoom: 17, // Esri bakes "Map data not available" into tiles above 17 in low-coverage areas
  },
  {
    id: 'dark',
    label: 'Dark',
    tiles: ['https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'],
    attribution: '&copy; CARTO',
    tileSize: 256,
    maxzoom: 18,
  },
  {
    id: 'terrain',
    label: 'Terrain',
    tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}'],
    attribution: 'Tiles &copy; Esri',
    tileSize: 256,
    maxzoom: 17, // Same Esri limitation as satellite
  },
] as const;

type BasemapId = (typeof BASEMAPS)[number]['id'];

// ─── Legend ───────────────────────────────────────────────────────────────────

const LEGEND = [
  { color: '#10B981', label: 'Verified' },
  { color: '#F59E0B', label: 'Pending' },
  { color: '#3B82F6', label: 'Rice' },
  { color: '#EF4444', label: 'Maize' },
  { color: '#EC4899', label: 'Cassava' },
  { color: '#14B8A6', label: 'Yam' },
  { color: '#8B5CF6', label: 'Wheat' },
  { color: '#F97316', label: 'Beans' },
  { color: '#6B7280', label: 'Other' },
];

// ─── Data-driven color expression (shared by circle + fill + line layers) ────

const FARM_COLOR: any[] = [
  'case',
  ['==', ['get', 'status'], 'verified'], '#10B981',
  [
    'match', ['downcase', ['coalesce', ['get', 'crop'], '']],
    'rice',    '#3B82F6',
    'maize',   '#EF4444',
    'cassava', '#EC4899',
    'yam',     '#14B8A6',
    'wheat',   '#8B5CF6',
    'beans',   '#F97316',
    '#F59E0B',
  ],
];

const EMPTY_FC: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };

// ─── Component ─────────────────────────────────────────────────────────────────

export default function AgriMapLibre({
  geoJson,
  pointsGeoJson,
  loading,
  onFarmSelect,
  onDeleteFarm,
  analysisTileUrl,
  selectedFarmId,
}: AgriMapLibreProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<any>(null);
  const popupRef     = useRef<any>(null);
  const onSelectRef  = useRef(onFarmSelect);
  const onDeleteRef  = useRef(onDeleteFarm);
  const [mapReady, setMapReady]     = useState(false);
  const [activeBase, setActiveBase] = useState<BasemapId>('streets');

  onSelectRef.current = onFarmSelect;
  onDeleteRef.current = onDeleteFarm;

  // ── 1. Init map (StrictMode-safe with local `cancelled` flag) ──────────────
  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current) return;

    // Local cancellation flag — immune to React StrictMode double-invocation
    let cancelled = false;

    // Inject MapLibre CSS once
    if (!document.getElementById('maplibre-css')) {
      const link = document.createElement('link');
      link.id   = 'maplibre-css';
      link.rel  = 'stylesheet';
      link.href = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css';
      document.head.appendChild(link);
    }

    import('maplibre-gl').then((mod) => {
      // Bail if cancelled (StrictMode cleanup ran) or already initialised
      if (cancelled || mapRef.current || !containerRef.current) return;

      const ML     = (mod as any).default ?? mod;
      const street = BASEMAPS[0];

      const map = new ML.Map({
        container: containerRef.current,
        center:    [8.6753, 9.082],   // Nigeria centroid
        zoom:      5.5,
        maxZoom:   19,
        attributionControl: true,
        style: {
          version: 8,
          glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
          sources: {
            basemap: {
              type:     'raster',
              tiles:    [...street.tiles],
              tileSize: street.tileSize,
              maxzoom:  street.maxzoom,
              attribution: street.attribution,
            },
            // Polygon source (shown when zoomed in)
            farms: { type: 'geojson', data: EMPTY_FC },
            // Point / centroid source (shown when zoomed out as dots)
            'farms-points': { type: 'geojson', data: EMPTY_FC },
            'analysis-tiles': { type: 'raster', tiles: [], tileSize: 256 },
          },
          layers: [
            // ── Basemap ──
            { id: 'basemap-layer', type: 'raster', source: 'basemap' },

            // ── Analysis overlay (hidden until tileUrl provided) ──
            {
              id: 'analysis-tiles-layer', type: 'raster', source: 'analysis-tiles',
              paint: { 'raster-opacity': 0.7 },
              layout: { visibility: 'none' },
            },

            // ── Polygons — outline at zoom ≥ 7, fill at zoom ≥ 9 ──
            {
              id: 'farms-fill', type: 'fill', source: 'farms',
              minzoom: 9,
              paint: { 'fill-color': FARM_COLOR, 'fill-opacity': 0.5 },
            },
            {
              id: 'farms-outline', type: 'line', source: 'farms',
              minzoom: 7,
              paint: { 'line-color': FARM_COLOR, 'line-width': 1.8, 'line-opacity': 0.9 },
            },

            // ── Selected polygon highlight ──
            {
              id: 'farms-selected-fill', type: 'fill', source: 'farms',
              minzoom: 9,
              filter: ['==', ['get', 'id'], '$$NONE$$'],
              paint: { 'fill-color': '#ffffff', 'fill-opacity': 0.25 },
            },
            {
              id: 'farms-selected-outline', type: 'line', source: 'farms',
              minzoom: 7,
              filter: ['==', ['get', 'id'], '$$NONE$$'],
              paint: { 'line-color': '#ffffff', 'line-width': 3, 'line-opacity': 1 },
            },

            // ── Dots — visible at zoom < 12 (overlaps polygons slightly for smooth transition) ──
            {
              id: 'farms-dots', type: 'circle', source: 'farms-points',
              maxzoom: 12,
              paint: {
                'circle-color':        FARM_COLOR,
                'circle-radius':       ['interpolate', ['linear'], ['zoom'], 4, 3, 8, 6, 11, 5],
                'circle-stroke-color': 'rgba(255,255,255,0.8)',
                'circle-stroke-width': 1,
                'circle-opacity':      ['interpolate', ['linear'], ['zoom'], 9, 1, 12, 0],
              },
            },

            // ── Selected dot highlight ──
            {
              id: 'farms-selected-dot', type: 'circle', source: 'farms-points',
              maxzoom: 12,
              filter: ['==', ['get', 'id'], '$$NONE$$'],
              paint: {
                'circle-color':        FARM_COLOR,
                'circle-radius':       ['interpolate', ['linear'], ['zoom'], 4, 6, 8, 10, 11, 8],
                'circle-stroke-color': '#ffffff',
                'circle-stroke-width': 2.5,
                'circle-opacity':      ['interpolate', ['linear'], ['zoom'], 9, 1, 12, 0],
              },
            },
          ],
        },
      });

      // Assign to ref synchronously before any async work
      mapRef.current = map;

      // Popup (reused)
      popupRef.current = new ML.Popup({
        closeButton: true,
        closeOnClick: false,
        maxWidth: '280px',
        className: 'agri-popup',
      });

      // Click on polygon fill OR dot
      const handleClick = (e: any) => {
        const p = e.features?.[0]?.properties as FarmProperties | undefined;
        if (!p) return;
        onSelectRef.current?.(p);
        const statusColor = p.status === 'verified' ? '#10B981' : '#F59E0B';
        const area = p.area ? `${Number(p.area).toFixed(2)} ha` : 'N/A';
        const safeId   = String(p.id   || '').replace(/"/g, '&quot;');
        const safeName = String(p.farmerName || p.name || 'Unknown Farmer').replace(/"/g, '&quot;');
        popupRef.current
          .setLngLat(e.lngLat)
          .setHTML(
            `<div style="font-family:system-ui,sans-serif;font-size:13px;line-height:1.6">
              <div style="font-weight:700;font-size:14px;margin-bottom:6px">${p.farmerName || p.name || 'Unknown Farmer'}</div>
              <div style="display:grid;grid-template-columns:auto 1fr;gap:2px 10px;color:#374151">
                <span style="color:#9CA3AF">Crop</span><span>${p.crop || 'N/A'}</span>
                <span style="color:#9CA3AF">Location</span><span>${[p.lga, p.state].filter(Boolean).join(', ') || 'N/A'}</span>
                <span style="color:#9CA3AF">Area</span><span>${area}</span>
                <span style="color:#9CA3AF">Status</span><span style="color:${statusColor};font-weight:600">${p.status || 'N/A'}</span>
              </div>
              <button id="agri-delete-btn" data-farm-id="${safeId}" data-farm-name="${safeName}"
                style="margin-top:10px;width:100%;padding:6px 10px;border-radius:6px;border:1px solid #FCA5A5;background:#FEF2F2;color:#DC2626;font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px">
                🗑️ Delete Farm
              </button>
            </div>`
          )
          .addTo(map);
        setTimeout(() => {
          const btn = popupRef.current?.getElement()?.querySelector('#agri-delete-btn') as HTMLElement | null;
          if (btn) {
            btn.addEventListener('click', (ev) => {
              ev.stopPropagation();
              const farmId   = btn.getAttribute('data-farm-id') || '';
              const farmName = btn.getAttribute('data-farm-name') || '';
              onDeleteRef.current?.(farmId, farmName);
            });
          }
        }, 0);
      };

      map.on('click', 'farms-fill', handleClick);
      map.on('click', 'farms-dots', handleClick);

      // Click outside any farm feature → deselect
      map.on('click', (e: any) => {
        const hits = map.queryRenderedFeatures(e.point, { layers: ['farms-fill', 'farms-dots'] });
        if (!hits.length) {
          onSelectRef.current?.(null);
          popupRef.current?.remove();
        }
      });

      // Cursor
      const setCursor = (c: string) => () => { map.getCanvas().style.cursor = c; };
      map.on('mouseenter', 'farms-fill', setCursor('pointer'));
      map.on('mouseleave', 'farms-fill', setCursor(''));
      map.on('mouseenter', 'farms-dots', setCursor('pointer'));
      map.on('mouseleave', 'farms-dots', setCursor(''));

      map.on('load', () => {
        if (cancelled) {
          // Component unmounted before load fired — clean up immediately
          map.remove();
          mapRef.current  = null;
          popupRef.current?.remove();
          popupRef.current = null;
          return;
        }
        setMapReady(true);
      });
    });

    return () => {
      cancelled = true;
      if (mapRef.current) {
        popupRef.current?.remove();
        mapRef.current.remove();
        mapRef.current  = null;
        popupRef.current = null;
      }
      setMapReady(false);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 2. Update polygon + point sources when data changes ─────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;

    // Polygon source
    (map.getSource('farms') as any)?.setData(geoJson ?? EMPTY_FC);

    // Point / dot source — use server-pre-built points (no centroid math)
    const ptData = pointsGeoJson ?? EMPTY_FC;
    (map.getSource('farms-points') as any)?.setData(ptData);

    // Auto-fit bounds to point data (always available even when no polygons)
    const fitData = ptData.features.length > 0 ? ptData : (geoJson ?? EMPTY_FC);
    if (fitData.features.length > 0) {
      import('maplibre-gl').then((mod) => {
        if (!mapRef.current) return;
        const ML = (mod as any).default ?? mod;
        let minLng = 180, minLat = 90, maxLng = -180, maxLat = -90;
        for (const f of fitData.features) {
          const coords =
            (f.geometry as any)?.type === 'Point'
              ? [(f.geometry as any).coordinates]
              : ((f.geometry as any)?.coordinates?.[0] ?? []);
          for (const [lng, lat] of coords) {
            if (lng < minLng) minLng = lng; if (lng > maxLng) maxLng = lng;
            if (lat < minLat) minLat = lat; if (lat > maxLat) maxLat = lat;
          }
        }
        if (minLng < maxLng && minLat < maxLat) {
          mapRef.current.fitBounds(
            new ML.LngLatBounds([minLng, minLat], [maxLng, maxLat]),
            { padding: 60, duration: 900, maxZoom: 12 }
          );
        }
      });
    }
  }, [geoJson, pointsGeoJson, mapReady]);

  // ── 3. Selected farm highlight ─────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const id     = selectedFarmId ?? '$$NONE$$';
    const filter = ['==', ['get', 'id'], id] as any;
    mapRef.current.setFilter('farms-selected-fill',    filter);
    mapRef.current.setFilter('farms-selected-outline', filter);
    mapRef.current.setFilter('farms-selected-dot',     filter);
  }, [selectedFarmId, mapReady]);

  // ── 4. Analysis tile overlay ───────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const src = mapRef.current.getSource('analysis-tiles') as any;
    if (!src) return;
    if (analysisTileUrl) {
      src.setTiles([analysisTileUrl]);
      mapRef.current.setLayoutProperty('analysis-tiles-layer', 'visibility', 'visible');
    } else {
      mapRef.current.setLayoutProperty('analysis-tiles-layer', 'visibility', 'none');
    }
  }, [analysisTileUrl, mapReady]);

  // ── Basemap switching ──────────────────────────────────────────────────────
  const switchBasemap = useCallback((id: BasemapId) => {
    if (!mapReady || !mapRef.current) return;
    const bm  = BASEMAPS.find((b) => b.id === id)!;
    const src = mapRef.current.getSource('basemap') as any;
    if (!src) return;
    src.setTiles([...bm.tiles]);
    setActiveBase(id);
  }, [mapReady]);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* Loading overlay */}
      {loading && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(10,14,20,0.5)', backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            background: 'rgba(255,255,255,0.95)', borderRadius: 12, padding: '14px 24px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
            display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, color: '#111827',
          }}>
            <div style={{
              width: 18, height: 18, border: '2.5px solid #10B981',
              borderTopColor: 'transparent', borderRadius: '50%',
              animation: 'aml-spin 0.7s linear infinite',
            }} />
            Loading farms…
          </div>
        </div>
      )}

      {/* Basemap switcher — top-right */}
      <div style={{
        position: 'absolute', top: 12, right: 12, zIndex: 5,
        display: 'flex', flexDirection: 'column', gap: 4,
      }}>
        <span style={{
          fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.8)',
          textTransform: 'uppercase', letterSpacing: '0.07em',
          textShadow: '0 1px 3px rgba(0,0,0,0.6)', marginBottom: 2, textAlign: 'center',
        }}>Basemap</span>
        {BASEMAPS.map((bm) => (
          <button
            key={bm.id}
            onClick={() => switchBasemap(bm.id)}
            style={{
              padding:      '5px 12px', borderRadius: 6,
              border:       activeBase === bm.id ? '1.5px solid #10B981' : '1.5px solid rgba(255,255,255,0.25)',
              background:   activeBase === bm.id ? 'rgba(16,185,129,0.85)' : 'rgba(15,20,30,0.65)',
              color:        '#fff', fontWeight: activeBase === bm.id ? 700 : 400,
              fontSize: 12, cursor: 'pointer', backdropFilter: 'blur(8px)',
              transition: 'all 0.15s ease', whiteSpace: 'nowrap' as const,
              boxShadow: '0 1px 6px rgba(0,0,0,0.25)',
            }}
          >
            {bm.label}
          </button>
        ))}
      </div>

      {/* Legend — bottom-right */}
      <div style={{
        position: 'absolute', bottom: 28, right: 12, zIndex: 5,
        background: 'rgba(10,14,20,0.65)', backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.1)',
        padding: '10px 14px', borderRadius: 10,
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      }}>
        <p style={{
          fontWeight: 700, marginBottom: 8, fontSize: 10, color: 'rgba(255,255,255,0.65)',
          textTransform: 'uppercase', letterSpacing: '0.08em',
        }}>Farms</p>
        {LEGEND.map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4, fontSize: 12 }}>
            <div style={{
              width: 10, height: 10, background: color, borderRadius: '50%', flexShrink: 0,
              boxShadow: `0 0 5px ${color}88`,
            }} />
            <span style={{ color: 'rgba(255,255,255,0.75)' }}>{label}</span>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes aml-spin { to { transform: rotate(360deg); } }
        .agri-popup .maplibregl-popup-content {
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
