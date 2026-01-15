'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';

interface PolygonMapProps {
  polygonData: any;
  width?: number;
  height?: number;
  showCoordinates?: boolean;
  className?: string;
  title?: string;
}

interface Bounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

const PolygonMap: React.FC<PolygonMapProps> = ({ 
  polygonData, 
  width = 500, 
  height = 350, 
  showCoordinates = true,
  className = "",
  title = "Farm Polygon"
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [coordinates, setCoordinates] = useState<number[][]>([]);
  const [bounds, setBounds] = useState<Bounds | null>(null);

  const extractCoordinates = useCallback((data: any): number[][] => {
    // Handle null or undefined
    if (!data) return [];
    
    // Handle string data (JSON)
    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data);
        return extractCoordinates(parsed);
      } catch (e) {
        console.error('Failed to parse JSON string:', e);
        return [];
      }
    }
    
    // Handle GPS tracking data format - array of objects with latitude/longitude
    if (Array.isArray(data) && data.length > 0 && data[0].latitude && data[0].longitude) {
      return data.map(point => [parseFloat(point.longitude), parseFloat(point.latitude)]);
    }
    
    // Handle GeoJSON Polygon
    if (data.type === 'Polygon' && data.coordinates && Array.isArray(data.coordinates)) {
      return data.coordinates[0]; // First ring
    }
    
    // Handle GeoJSON Feature with Polygon geometry
    if (data.type === 'Feature' && data.geometry && data.geometry.type === 'Polygon') {
      return data.geometry.coordinates[0];
    }
    
    // Handle direct coordinates array (nested arrays)
    if (Array.isArray(data)) {
      // Check if it's an array of coordinate pairs
      if (data.length > 0 && Array.isArray(data[0])) {
        // If first element is array with 2 numbers, it's coordinate pairs
        if (data[0].length >= 2 && typeof data[0][0] === 'number') {
          return data;
        }
        // If nested deeper (like GeoJSON coordinates)
        if (Array.isArray(data[0][0]) && data[0][0].length >= 2) {
          return data[0];
        }
      }
    }
    
    // Handle object with coordinates property
    if (data.coordinates) {
      return extractCoordinates(data.coordinates);
    }
    
    // Handle object with geometry property
    if (data.geometry) {
      return extractCoordinates(data.geometry);
    }
    
    // Handle flat array of alternating lng/lat values
    if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'number' && data.length % 2 === 0) {
      const pairs: number[][] = [];
      for (let i = 0; i < data.length; i += 2) {
        pairs.push([data[i], data[i + 1]]);
      }
      return pairs;
    }
    
    return [];
  }, []);

  const drawGrid = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 0.5;
    const gridSize = 40;
    
    // Vertical lines
    for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    
    // Horizontal lines
    for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }, [width, height]);
  
  const drawCompass = useCallback((ctx: CanvasRenderingContext2D) => {
    const compassX = width - 40;
    const compassY = 40;
    
    // Compass circle
    ctx.beginPath();
    ctx.arc(compassX, compassY, 20, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fill();
    ctx.strokeStyle = '#6b7280';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // North arrow
    ctx.beginPath();
    ctx.moveTo(compassX, compassY - 15);
    ctx.lineTo(compassX + 5, compassY);
    ctx.lineTo(compassX, compassY + 15);
    ctx.lineTo(compassX - 5, compassY);
    ctx.closePath();
    ctx.fillStyle = '#ef4444';
    ctx.fill();
    
    // N label
    ctx.fillStyle = '#374151';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('N', compassX, compassY - 25);
  }, [width]);

  const drawPolygon = useCallback((coords: number[][], boundsData: Bounds) => {
    const canvas = canvasRef.current;
    if (!canvas || coords.length === 0) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas size
    canvas.width = width;
    canvas.height = height;
    
    // Clear canvas
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, width, height);
    
    // Draw grid
    drawGrid(ctx);
    
    // Calculate scaling
    const padding = 30;
    const drawWidth = width - padding * 2;
    const drawHeight = height - padding * 2;
    
    const latRange = boundsData.maxLat - boundsData.minLat || 0.001;
    const lngRange = boundsData.maxLng - boundsData.minLng || 0.001;
    
    // Convert coordinates to canvas coordinates
    const canvasCoords = coords.map(([lng, lat]) => {
      const x = padding + ((lng - boundsData.minLng) / lngRange) * drawWidth;
      const y = padding + ((boundsData.maxLat - lat) / latRange) * drawHeight; // Flip Y
      return [x, y];
    });
    
    // Draw polygon
    if (canvasCoords.length > 0) {
      // Fill polygon
      ctx.beginPath();
      ctx.moveTo(canvasCoords[0][0], canvasCoords[0][1]);
      for (let i = 1; i < canvasCoords.length; i++) {
        ctx.lineTo(canvasCoords[i][0], canvasCoords[i][1]);
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(34, 197, 94, 0.2)';
      ctx.fill();
      
      // Stroke polygon
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Draw points
      canvasCoords.forEach(([x, y], index) => {
        // Point circle
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#22c55e';
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Point label
        ctx.fillStyle = '#374151';
        ctx.font = '12px monospace';
        ctx.fillText((index + 1).toString(), x + 8, y - 8);
      });
    }
    
    // Draw compass
    drawCompass(ctx);
  }, [width, height, drawGrid, drawCompass]);

  useEffect(() => {
    if (!polygonData) {
      return;
    }

    try {
      let coords = extractCoordinates(polygonData);
      
      if (coords.length === 0) {
        return;
      }

      setCoordinates(coords);
      
      // Calculate bounds
      const lats = coords.map(coord => parseFloat(coord[1].toString()));
      const lngs = coords.map(coord => parseFloat(coord[0].toString()));
      
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);

      const boundsData = { minLat, maxLat, minLng, maxLng };
      setBounds(boundsData);
      
      // Draw on canvas
      drawPolygon(coords, boundsData);
      
    } catch (error) {
      console.error('Error processing polygon data:', error);
    }
  }, [polygonData, width, height, extractCoordinates, drawPolygon]);

  const formatCoordinate = (coord: number) => {
    return parseFloat(coord.toString()).toFixed(6);
  };

  if (!polygonData) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 rounded-lg border ${className}`} style={{ width, height }}>
        <div className="text-center text-gray-500 p-4">
          <svg className="mx-auto h-12 w-12 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 01.553-.894L9 2l6 3 6-3v11.382a1 1 0 01-.553.894L15 17l-6-3z" />
          </svg>
          <p className="text-sm">No polygon data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`border border-gray-200 rounded-lg bg-white ${className}`}>
      {title && (
        <div className="px-4 py-2 border-b border-gray-200">
          <h4 className="text-sm font-medium text-gray-900">{title}</h4>
        </div>
      )}
      
      <div className="p-4">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="border border-gray-300 rounded bg-gray-50 w-full"
          style={{ maxWidth: '100%', height: 'auto' }}
        />
        
        {showCoordinates && coordinates.length > 0 && bounds && (
          <div className="mt-3 text-xs text-gray-600 space-y-1">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="font-medium">Bounds:</span>
              </div>
              <div></div>
              <div>North: {formatCoordinate(bounds.maxLat)}°</div>
              <div>East: {formatCoordinate(bounds.maxLng)}°</div>
              <div>South: {formatCoordinate(bounds.minLat)}°</div>
              <div>West: {formatCoordinate(bounds.minLng)}°</div>
            </div>
            <div className="pt-1 border-t">
              <span className="font-medium">Points:</span> {coordinates.length}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PolygonMap;
