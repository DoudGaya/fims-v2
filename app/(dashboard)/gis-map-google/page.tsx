'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useSession } from 'next-auth/react';

// MapLibre GL JS — GPU-accelerated, free, no API key needed
const AgriMapLibre = dynamic(() => import('@/components/maps/AgriMapLibre'), { ssr: false });

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
  const { data: session } = useSession();
  const [farms, setFarms] = useState<any[]>([]);
  const [geoJson, setGeoJson] = useState<any>(null);
  const [pointsGeoJson, setPointsGeoJson] = useState<any>(null);
  const [totalFarms, setTotalFarms] = useState(0);
  const [selectedFarmId, setSelectedFarmId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(1000);

  const LIMIT_OPTIONS = [
    { label: '1,000',  value: 1000  },
    { label: '5,000',  value: 5000  },
    { label: '10,000', value: 10000 },
    { label: 'All',    value: 0     },
  ];

  const [selectedFarm, setSelectedFarm] = useState<any | null>(null);
  const [requestDeleteTarget, setRequestDeleteTarget] = useState<{ farmId: string; farmName: string } | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState<string | null>(null);

  // GIS Analysis State
  const [activeLayer, setActiveLayer] = useState<string | null>(null);
  const [analysisStats, setAnalysisStats] = useState<any>(null);
  const [analysisTileUrl, setAnalysisTileUrl] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const url = limit > 0 ? `/api/farms/geojson?limit=${limit}` : '/api/farms/geojson';
      const res = await fetch(url);
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Failed loading farms');
      const polygonFarms: any[] = data.farms || [];
      setFarms(polygonFarms);
      setGeoJson(data.geoJson ?? null);

      // Use server-built points (all farms with valid Nigerian lat/lng, up to 5 000)
      setPointsGeoJson(data.pointsGeoJson ?? null);
      setTotalFarms(data.statistics?.surveyedPolygons ?? polygonFarms.length ?? 0);
    } catch (e: any) {
      setError(e.message);
      setFarms([]);
    } finally {
      setLoading(false);
    }
  }, [limit]);

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
        // Normalise stats shape across different API responses
        let statsData: any = null;
        if (['WEATHER', 'TEMPERATURE'].includes(layerId) && result.data?.current) {
          // Weather API: use rich current weather object (has .temperature, .wind_speed, etc.)
          statsData = result.data.current;
        } else if (layerId === 'PRECIPITATION' && result.data?.current) {
          // Build precipitation-specific stats from forecast data
          const total5d = result.data.forecast?.reduce(
            (s: number, f: any) => s + (f.rain || 0), 0
          ) || 0;
          statsData = {
            mean:        result.data.current.rain_1h || result.data.current.rain_3h || 0,
            total:       parseFloat(total5d.toFixed(1)),
            unit:        'mm',
            humidity:    result.data.current.humidity,
            description: `${total5d.toFixed(1)} mm forecast (5 days)`,
          };
        } else {
          // GIS API (Open-Meteo) or AIR_QUALITY — stats is at top level or data.stats
          statsData = result.stats ?? result.data?.stats ?? result.data ?? result;
        }
        setAnalysisStats(statsData);
        setAnalysisTileUrl(result.tileUrl || result.data?.tileUrl || null);
      } else {
        throw new Error(result.error || 'Analysis failed');
      }
    } catch (err: any) {
      console.error("Analysis failed", err);
      setError(err.message || "Analysis failed to run. Try selecting another layer.");
    } finally {
      setAnalysisLoading(false);
    }
  };

  const handleDeleteFarm = (farmId: string, farmName: string) => {
    setRequestDeleteTarget({ farmId, farmName });
    setDeleteReason('');
  };

  const submitDeleteRequest = async () => {
    if (!requestDeleteTarget || !deleteReason.trim()) return;
    setSubmittingRequest(true);
    try {
      const res = await fetch('/api/farms/delete-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ farmId: requestDeleteTarget.farmId, reason: deleteReason.trim() }),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error || 'Request failed');
      }
      setRequestSuccess(`Deletion request submitted for "${requestDeleteTarget.farmName}". It will be reviewed by an admin.`);
      setRequestDeleteTarget(null);
      setDeleteReason('');
    } catch (err: any) {
      setError(err.message || 'Failed to submit delete request');
      setRequestDeleteTarget(null);
    } finally {
      setSubmittingRequest(false);
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

  const handleFarmSelect = (farmProps: any) => {
      // farmProps comes from MapLibre feature.properties (id, farmerName, crop, state, lga, area, status)
      // For analysis we need full farm object (with coordinates) from the farms array
      const fullFarm = farmProps ? (farms.find((f: any) => f.id === farmProps.id) ?? farmProps) : null;
      setSelectedFarm(fullFarm);
      setSelectedFarmId(farmProps?.id ?? null);
      if (fullFarm && activeLayer) {
          runAnalysis(activeLayer, fullFarm);
      } else if (!fullFarm) {
          setAnalysisStats(null);
          setAnalysisTileUrl(null);
      }
  };


  useEffect(() => { loadData(); }, [loadData]);

  // ── Stats card helper ──────────────────────────────────────────────────────
  const renderStats = () => {
    if (!activeLayer || !analysisStats) return null;
    if (activeLayer === 'WEATHER' && analysisStats.temperature !== undefined) {
      return (
        <>
          <StatChip label="Temp" value={`${analysisStats.temperature}°C`} accent="#3B82F6" />
          <StatChip label="Humidity" value={`${analysisStats.humidity}%`} accent="#06B6D4" />
          <StatChip label="Wind" value={`${analysisStats.wind_speed} m/s`} accent="#8B5CF6" />
          {analysisStats.description && (
            <StatChip label="Cond." value={analysisStats.description} accent="#6B7280" />
          )}
        </>
      );
    }
    if (activeLayer === 'TEMPERATURE') {
      return (
        <>
          <StatChip label="Avg Temp" value={`${analysisStats.mean ?? analysisStats.temperature ?? 'N/A'}°C`} accent="#F59E0B" />
          {analysisStats.min !== undefined && (
            <StatChip label="Min" value={`${analysisStats.min}°C`} accent="#6B7280" />
          )}
          {analysisStats.max !== undefined && (
            <StatChip label="Max" value={`${analysisStats.max}°C`} accent="#EF4444" />
          )}
        </>
      );
    }
    // GIS / AIR_QUALITY / PRECIPITATION
    const unit = analysisStats.unit ? ` ${analysisStats.unit}` : '';
    const mainVal = analysisStats.mean ?? analysisStats.total ?? analysisStats.aqi;
    return (
      <>
        {mainVal !== undefined && (
          <StatChip
            label={activeLayer.replace(/_/g, ' ')}
            value={`${mainVal}${unit}`}
            accent="#10B981"
          />
        )}
        {analysisStats.min !== undefined && (
          <StatChip label="Min" value={`${analysisStats.min}${unit}`} accent="#6B7280" />
        )}
        {analysisStats.max !== undefined && (
          <StatChip label="Max" value={`${analysisStats.max}${unit}`} accent="#EF4444" />
        )}
        {analysisStats.health && (
          <StatChip label="Health" value={analysisStats.health} accent="#10B981" />
        )}
        {analysisStats.description && (
          <StatChip label="Note" value={analysisStats.description} accent="#6B7280" />
        )}
        {activeLayer === 'SOIL_MOISTURE' && analysisStats.rootZone !== undefined && (
          <StatChip label="Root Zone" value={`${analysisStats.rootZone}%`} accent="#92400E" />
        )}
        {analysisStats.source && (
          <StatChip label="Source" value={analysisStats.source} accent="#6B7280" small />
        )}
      </>
    );
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>

      {/* ── Full-bleed map ── */}
      <AgriMapLibre
        geoJson={geoJson}
        pointsGeoJson={pointsGeoJson}
        loading={loading}
        onFarmSelect={handleFarmSelect}
        onDeleteFarm={handleDeleteFarm}
        analysisTileUrl={analysisTileUrl}
        selectedFarmId={selectedFarmId}
      />

      {/* ── Top-left: title + farm count ── */}
      <div style={{
        position: 'absolute', top: 14, left: 14, zIndex: 10,
        background: 'rgba(10,14,20,0.65)', backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 12, padding: '10px 16px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
      }}>
        <p style={{ fontWeight: 700, fontSize: 14, color: '#fff', margin: 0 }}>
          Precision Ag Platform
        </p>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', margin: '2px 0 0' }}>
          {loading
            ? 'Loading farms…'
            : (() => {
                const polyCount = (geoJson as any)?.features?.length ?? 0;
                return polyCount > 0
                  ? `${polyCount.toLocaleString()} surveyed farm${polyCount !== 1 ? 's' : ''} · Click to analyze`
                  : 'No surveyed polygon farms yet';
              })()
          }
        </p>
        {/* Limit selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>Load:</span>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            disabled={loading}
            style={{
              fontSize: 11, background: 'rgba(255,255,255,0.1)', color: '#fff',
              border: '1px solid rgba(255,255,255,0.2)', borderRadius: 6,
              padding: '2px 6px', cursor: 'pointer', outline: 'none',
            }}
          >
            {LIMIT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value} style={{ background: '#1a1f2e', color: '#fff' }}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        {selectedFarm && (
          <div style={{
            marginTop: 8,
            paddingTop: 8,
            borderTop: '1px solid rgba(255,255,255,0.1)',
          }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#10B981', margin: 0 }}>
              {selectedFarm.farmerName || 'Farm selected'}
            </p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', margin: '1px 0 0' }}>
              {[selectedFarm.lga, selectedFarm.state].filter(Boolean).join(', ')}
            </p>
          </div>
        )}
        {error && (
          <p style={{ fontSize: 11, color: '#F87171', margin: '6px 0 0' }}>{error}</p>
        )}
      </div>

      {/* ── Bottom-center: analysis dock ── */}
      <div style={{
        position: 'absolute',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
        maxWidth: 'calc(100vw - 280px)',   // leave room for legend + basemap switcher
        width: 'max-content',
      }}>

        {/* Analysis result chips — shown when active layer has data */}
        {activeLayer && !analysisLoading && analysisStats && (
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center',
            padding: '10px 14px',
            background: 'rgba(10,14,20,0.65)', backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 12,
            boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
          }}>
            {renderStats()}
          </div>
        )}

        {/* Analysis spinner */}
        {analysisLoading && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 16px',
            background: 'rgba(10,14,20,0.65)', backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 10,
            boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
            color: 'rgba(255,255,255,0.8)', fontSize: 12,
          }}>
            <div style={{
              width: 14, height: 14, border: '2px solid #10B981',
              borderTopColor: 'transparent', borderRadius: '50%',
              animation: 'gis-spin 0.7s linear infinite',
            }} />
            Analyzing {activeLayer?.replace(/_/g, ' ')}…
          </div>
        )}

        {/* Layer grid buttons */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${ANALYSIS_OPTIONS.length}, 1fr)`,
          gap: 6,
          padding: '10px 14px',
          background: 'rgba(10,14,20,0.62)', backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 16,
          boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
        }}>
          {ANALYSIS_OPTIONS.map((opt) => {
            const isActive = activeLayer === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => handleLayerChange(opt.id)}
                disabled={analysisLoading}
                title={opt.name}
                style={{
                  display:        'flex',
                  flexDirection:  'column',
                  alignItems:     'center',
                  gap:            4,
                  padding:        '8px 12px',
                  borderRadius:   10,
                  border:         isActive
                    ? '1.5px solid rgba(16,185,129,0.8)'
                    : '1.5px solid rgba(255,255,255,0.08)',
                  background:     isActive
                    ? 'rgba(16,185,129,0.18)'
                    : 'rgba(255,255,255,0.05)',
                  color:          isActive ? '#10B981' : 'rgba(255,255,255,0.7)',
                  cursor:         analysisLoading ? 'not-allowed' : 'pointer',
                  opacity:        analysisLoading && !isActive ? 0.5 : 1,
                  transition:     'all 0.15s ease',
                  minWidth:       60,
                  boxShadow:      isActive ? '0 0 12px rgba(16,185,129,0.2)' : 'none',
                  whiteSpace:     'nowrap' as const,
                }}
              >
                <span style={{ fontSize: 18, lineHeight: 1 }}>{opt.icon}</span>
                <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 400, textAlign: 'center' as const }}>
                  {opt.name.split(' ').slice(0, 2).join('\n')}
                </span>
              </button>
            );
          })}
        </div>

        {/* Hint when no farm selected */}
        {!selectedFarm && !loading && (
          <p style={{
            fontSize: 11, color: 'rgba(255,255,255,0.5)',
            background: 'rgba(10,14,20,0.5)', backdropFilter: 'blur(8px)',
            padding: '5px 12px', borderRadius: 20,
            border: '1px solid rgba(255,255,255,0.08)',
          }}>
            Click a farm polygon to analyze
          </p>
        )}
      </div>

      {/* ── Success banner ── */}
      {requestSuccess && (
        <div style={{
          position: 'absolute', top: 14, right: 14, zIndex: 50,
          background: 'rgba(16,185,129,0.15)', backdropFilter: 'blur(16px)',
          border: '1px solid rgba(16,185,129,0.5)',
          borderRadius: 12, padding: '12px 18px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
          maxWidth: 380,
        }}>
          <p style={{ fontWeight: 600, fontSize: 13, color: '#10B981', margin: 0 }}>Request Submitted ✓</p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', margin: '4px 0 0', lineHeight: 1.6 }}>
            {requestSuccess}
          </p>
          <button
            onClick={() => setRequestSuccess(null)}
            style={{
              marginTop: 8, fontSize: 11, color: 'rgba(255,255,255,0.5)',
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ── Delete request modal ── */}
      {requestDeleteTarget && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            background: 'rgba(15,20,30,0.95)', backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 14, padding: '24px 28px',
            boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
            maxWidth: 400, width: 'calc(100vw - 48px)',
            display: 'flex', flexDirection: 'column', gap: 14,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 22 }}>📋</span>
              <p style={{ fontWeight: 700, fontSize: 15, color: '#fff', margin: 0 }}>Request Farm Deletion</p>
            </div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', margin: 0, lineHeight: 1.7 }}>
              Submit a deletion request for{' '}
              <strong style={{ color: '#fff' }}>{requestDeleteTarget.farmName}</strong>.{' '}
              An admin will review and approve before the farm is permanently removed.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>
                Reason for deletion <span style={{ color: '#F87171' }}>*</span>
              </label>
              <textarea
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="Describe why this farm should be deleted…"
                rows={3}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 8, padding: '8px 12px',
                  color: '#fff', fontSize: 13, lineHeight: 1.6,
                  resize: 'vertical', outline: 'none',
                  fontFamily: 'system-ui, sans-serif',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => { setRequestDeleteTarget(null); setDeleteReason(''); }}
                disabled={submittingRequest}
                style={{
                  flex: 1, padding: '9px 0', borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.18)',
                  background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.8)',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={submitDeleteRequest}
                disabled={submittingRequest || !deleteReason.trim()}
                style={{
                  flex: 1, padding: '9px 0', borderRadius: 8,
                  border: '1px solid rgba(251,191,36,0.6)',
                  background: submittingRequest || !deleteReason.trim() ? 'rgba(251,191,36,0.2)' : 'rgba(251,191,36,0.25)',
                  color: submittingRequest || !deleteReason.trim() ? 'rgba(251,191,36,0.4)' : '#FBBf24',
                  fontSize: 13, fontWeight: 700,
                  cursor: submittingRequest || !deleteReason.trim() ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                {submittingRequest
                  ? <><div style={{ width: 12, height: 12, border: '2px solid rgba(251,191,36,0.4)', borderTopColor: '#FBBf24', borderRadius: '50%', animation: 'gis-spin 0.7s linear infinite' }} /> Submitting…</>
                  : '📋 Submit Request'
                }
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes gis-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Tiny stat chip ─────────────────────────────────────────────────────────────
function StatChip({
  label, value, accent, small,
}: { label: string; value: string; accent: string; small?: boolean }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
      padding: '6px 12px', borderRadius: 8,
      background: `${accent}18`,
      border: `1px solid ${accent}44`,
      minWidth: small ? 60 : 80,
    }}>
      <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
        {label}
      </span>
      <span style={{ fontSize: small ? 11 : 16, fontWeight: 700, color: '#fff', lineHeight: 1.2, textAlign: 'center' as const }}>
        {value}
      </span>
    </div>
  );
}
