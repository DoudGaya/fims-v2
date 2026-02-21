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
    
    // Calculate scaling with proper padding
    const padding = 40;
    const drawWidth = width - padding * 2;
    const drawHeight = height - padding * 2;
    
    const latRange = boundsData.maxLat - boundsData.minLat || 0.001;
    const lngRange = boundsData.maxLng - boundsData.minLng || 0.001;
    
    // Calculate aspect ratio to maintain proper proportions
    const latLngRatio = latRange / lngRange;
    const canvasRatio = drawHeight / drawWidth;
    
    let effectiveWidth = drawWidth;
    let effectiveHeight = drawHeight;
    let offsetX = 0;
    let offsetY = 0;
    
    if (latLngRatio > canvasRatio) {
      // Constrained by height
      effectiveWidth = drawHeight / latLngRatio;
      offsetX = (drawWidth - effectiveWidth) / 2;
    } else {
      // Constrained by width
      effectiveHeight = drawWidth * latLngRatio;
      offsetY = (drawHeight - effectiveHeight) / 2;
    }
    
    // Convert coordinates to canvas coordinates with proper scaling
    const canvasCoords = coords.map(([lng, lat]) => {
      const x = padding + offsetX + ((lng - boundsData.minLng) / lngRange) * effectiveWidth;
      const y = padding + offsetY + ((boundsData.maxLat - lat) / latRange) * effectiveHeight; // Flip Y
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
      
      // Draw coordinate points with precise markers
      canvasCoords.forEach(([x, y], index) => {
        // Outer circle (white border)
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fillStyle = 'white';
        ctx.fill();
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Inner circle (green)
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#22c55e';
        ctx.fill();
        
        // Point label with background
        const label = (index + 1).toString();
        ctx.font = 'bold 11px monospace';
        const metrics = ctx.measureText(label);
        const labelX = x + 10;
        const labelY = y - 8;
        
        // Label background
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillRect(labelX - 2, labelY - 10, metrics.width + 4, 14);
        
        // Label border
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 1;
        ctx.strokeRect(labelX - 2, labelY - 10, metrics.width + 4, 14);
        
        // Label text
        ctx.fillStyle = '#15803d';
        ctx.fillText(label, labelX, labelY);
      });
      
      // Draw connecting lines with direction arrows
      ctx.strokeStyle = '#86efac';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 3]);
      
      for (let i = 0; i < canvasCoords.length; i++) {
        const [x1, y1] = canvasCoords[i];
        const [x2, y2] = canvasCoords[(i + 1) % canvasCoords.length];
        
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        
        // Draw small arrow in the middle of the line
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;
        const angle = Math.atan2(y2 - y1, x2 - x1);
        
        ctx.save();
        ctx.translate(midX, midY);
        ctx.rotate(angle);
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.moveTo(3, 0);
        ctx.lineTo(-3, -3);
        ctx.lineTo(-3, 3);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      
      ctx.setLineDash([]);
    }
    
    // Draw compass
    drawCompass(ctx);
    
    // Draw scale indicator
    const scaleText = `Scale: ${(lngRange * 111).toFixed(2)} km (approx)`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(10, height - 30, ctx.measureText(scaleText).width + 10, 20);
    ctx.fillStyle = '#374151';
    ctx.font = '10px Arial';
    ctx.fillText(scaleText, 15, height - 15);
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
          <div className="mt-3 space-y-3">
            <div className="text-xs text-gray-600 grid grid-cols-2 gap-2 pb-2 border-b">
              <div>
                <span className="font-semibold">Bounds:</span>
              </div>
              <div></div>
              <div>North: <span className="font-mono">{formatCoordinate(bounds.maxLat)}°</span></div>
              <div>East: <span className="font-mono">{formatCoordinate(bounds.maxLng)}°</span></div>
              <div>South: <span className="font-mono">{formatCoordinate(bounds.minLat)}°</span></div>
              <div>West: <span className="font-mono">{formatCoordinate(bounds.minLng)}°</span></div>
            </div>
            
            <div className="text-xs">
              <div className="font-semibold text-gray-700 mb-2">
                Coordinate Points ({coordinates.length}):
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1 bg-gray-50 p-2 rounded">
                {coordinates.map((coord, index) => (
                  <div key={index} className="flex items-center gap-2 text-xs font-mono">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold">
                      {index + 1}
                    </span>
                    <span className="text-gray-600">
                      Lat: <span className="text-gray-900">{formatCoordinate(coord[1])}</span>
                    </span>
                    <span className="text-gray-600">
                      Lng: <span className="text-gray-900">{formatCoordinate(coord[0])}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="text-xs text-gray-500 pt-2 border-t">
              <div>Area: ~{((bounds.maxLat - bounds.minLat) * (bounds.maxLng - bounds.minLng) * 111 * 111).toFixed(2)} km²</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PolygonMap;
