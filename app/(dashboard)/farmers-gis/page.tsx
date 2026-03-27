'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/components/PermissionProvider';
import { PERMISSIONS } from '@/lib/permissions';

const FarmersMapLibre = dynamic(() => import('@/components/maps/FarmersMapLibre'), { ssr: false });

export default function FarmersGISPage() {
  const { status } = useSession();
  const router = useRouter();
  const { hasPermission, loading: permissionsLoading } = usePermissions();

  const [geoJson, setGeoJson] = useState<GeoJSON.FeatureCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [total, setTotal]     = useState(0);
  const [limit, setLimit]     = useState(5000);

  const LIMIT_OPTIONS = [
    { label: '1,000',  value: 1000  },
    { label: '5,000',  value: 5000  },
    { label: '10,000', value: 10000 },
    { label: 'All',    value: 0     },
  ];

  useEffect(() => {
    if (status === 'loading' || permissionsLoading) return;
    if (status === 'unauthenticated') { router.push('/auth/signin'); return; }
    if (!hasPermission(PERMISSIONS.GIS_VIEW)) { router.push('/dashboard'); }
  }, [status, permissionsLoading, router, hasPermission]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const url = limit > 0 ? `/api/farmers/geojson?limit=${limit}` : '/api/farmers/geojson';
      const res  = await fetch(url);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed loading farmers');
      setGeoJson(data.geoJson ?? null);
      setTotal(data.total ?? 0);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    if (status === 'authenticated' && !permissionsLoading) loadData();
  }, [status, permissionsLoading, loadData]);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-white shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold text-gray-900">Farmers GIS</span>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">Satellite View</span>
        </div>
        <div className="flex items-center gap-3">
          {error && <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">{error}</span>}
          <span className="text-sm text-gray-600">
            <span className="font-semibold text-gray-900">{total.toLocaleString()}</span> farmers mapped
          </span>
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-gray-500">Load:</label>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              disabled={loading}
              className="text-xs border border-gray-200 rounded px-2 py-1 bg-white text-gray-700 disabled:opacity-50 cursor-pointer"
            >
              {LIMIT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <button onClick={loadData} disabled={loading}
            className="text-xs px-3 py-1.5 rounded-md border border-gray-200 hover:bg-gray-50 text-gray-700 disabled:opacity-50">
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Map — full width, no sidebar */}
      <div className="flex-1 min-h-0">
        <FarmersMapLibre geoJson={geoJson} loading={loading} />
      </div>
    </div>
  );
}
