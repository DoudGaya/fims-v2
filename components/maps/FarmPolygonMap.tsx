'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { GoogleMap, useJsApiLoader, Polygon } from '@react-google-maps/api';

const containerStyle = {
    width: '100%',
    height: '400px' // Increased height
};

const center = {
    lat: 9.0820, // Nigeria default
    lng: 8.6753
};

interface Coordinate {
    lat: number;
    lng: number;
}

interface FarmPolygonMapProps {
    polygonData: any[]; // Array of {latitude, longitude} or similar
}

export default function FarmPolygonMap({ polygonData }: FarmPolygonMapProps) {
    const { isLoaded, loadError } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''
    });

    const [map, setMap] = useState<google.maps.Map | null>(null);

    const paths = useMemo(() => {
        if (!polygonData || !Array.isArray(polygonData)) return [];
        return polygonData.map(point => ({
            lat: point.latitude || point.lat,
            lng: point.longitude || point.lng
        }));
    }, [polygonData]);

    const mapCenter = useMemo(() => {
        if (paths.length > 0) {
            // Simple centroid
            const lat = paths.reduce((sum, p) => sum + p.lat, 0) / paths.length;
            const lng = paths.reduce((sum, p) => sum + p.lng, 0) / paths.length;
            return { lat, lng };
        }
        return center;
    }, [paths]);

    const onLoad = useCallback(function callback(map: google.maps.Map) {
        if (paths.length > 0) {
            const bounds = new window.google.maps.LatLngBounds();
            paths.forEach(point => bounds.extend(point));
            map.fitBounds(bounds);
        }
        setMap(map);
    }, [paths]);

    const onUnmount = useCallback(function callback(map: google.maps.Map) {
        setMap(null);
    }, []);

    if (loadError) {
        return <div className="h-[400px] bg-red-50 rounded flex items-center justify-center p-4 text-center">
            <div className="text-red-600">
                <p className="font-semibold">Map Error</p>
                <p className="text-sm">{loadError.message}</p>
                <p className="text-xs mt-2 text-muted-foreground">Check API Key configuration.</p>
            </div>
        </div>;
    }

    if (!isLoaded) return <div className="h-[400px] bg-slate-100 rounded flex items-center justify-center">Loading Map...</div>;

    return (
        <GoogleMap
            mapContainerStyle={containerStyle}
            center={mapCenter}
            zoom={10}
            onLoad={onLoad}
            onUnmount={onUnmount}
            options={{
                mapTypeId: 'hybrid',
                streetViewControl: false,
                mapTypeControl: true,
                fullscreenControl: true,
            }}
        >
            {paths.length > 2 && (
                <Polygon
                    paths={paths}
                    options={{
                        fillColor: '#10b981', // Emerald 500
                        fillOpacity: 0.35,
                        strokeColor: '#059669', // Emerald 600
                        strokeOpacity: 1,
                        strokeWeight: 4, // Increased stroke weight
                    }}
                />
            )}
        </GoogleMap>
    );
}
