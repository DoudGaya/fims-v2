/**
 * Farm Size Calculation Utilities for Dashboard
 * Calculates farm sizes when not available in the database
 */

interface Coordinate {
  lat: number;
  lng: number;
}

/**
 * Calculate polygon area using the Shoelace formula
 * @param {Array} coordinates - Array of coordinate objects with latitude/longitude
 * @returns {number} Area in square meters
 */
export function calculatePolygonArea(coordinates: any[]): number {
  if (!coordinates || !Array.isArray(coordinates) || coordinates.length < 3) {
    return 0;
  }

  // Convert coordinates to proper format
  const points: Coordinate[] = coordinates.map(coord => {
    // Handle different coordinate formats
    if (coord.latitude !== undefined && coord.longitude !== undefined) {
      return { lat: parseFloat(coord.latitude), lng: parseFloat(coord.longitude) };
    } else if (coord.lat !== undefined && coord.lng !== undefined) {
      return { lat: parseFloat(coord.lat), lng: parseFloat(coord.lng) };
    } else if (Array.isArray(coord) && coord.length >= 2) {
      return { lat: parseFloat(coord[1]), lng: parseFloat(coord[0]) }; // GeoJSON format [lng, lat]
    }
    return null;
  }).filter((point): point is Coordinate => point !== null);

  if (points.length < 3) {
    return 0;
  }

  // Close the polygon if not already closed
  if (points[0].lat !== points[points.length - 1].lat || 
      points[0].lng !== points[points.length - 1].lng) {
    points.push({ ...points[0] });
  }

  // Calculate area using Shoelace formula
  // This is a simplified spherical approximation
  const R = 6378137; // Earth radius in meters
  let area = 0;
  
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    
    const lat1 = p1.lat * Math.PI / 180;
    const lat2 = p2.lat * Math.PI / 180;
    const lng1 = p1.lng * Math.PI / 180;
    const lng2 = p2.lng * Math.PI / 180;
    
    area += (lng2 - lng1) * (2 + Math.sin(lat1) + Math.sin(lat2));
  }
  
  area = Math.abs(area * R * R / 2);
  
  return area;
}

/**
 * Convert square meters to hectares
 * @param {number} sqMeters - Area in square meters
 * @returns {number} Area in hectares
 */
export function sqMetersToHectares(sqMeters: number): number {
  return Number((sqMeters / 10000).toFixed(2));
}
