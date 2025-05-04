import React, { useEffect } from 'react';
import mapboxgl from 'mapbox-gl';

interface Location {
  id: number;
  name: string;
  coordinates: [number, number];
  total: number;
}

interface MapMarkersProps {
  map: mapboxgl.Map | null;
  locations: Location[];
  onMarkerClick: (location: Location) => void;
}

const MapMarkers: React.FC<MapMarkersProps> = ({ map, locations, onMarkerClick }) => {
  // Reference to keep track of markers for cleanup
  const markersRef = React.useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    if (!map) return;

    // First remove any existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Create SVG icon as a data URL for better styling
    const createMarkerElement = (location: Location) => {
      // Create a DOM element for the marker
      const el = document.createElement('div');
      el.className = 'marker';
      el.style.width = '28px';
      el.style.height = '28px';
      
      // Custom styled SVG as a data URL
      const color = location.total > 3 ? '#FFD700' : '#E6C200';
      const svgIcon = `
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 10c0 4.5-8 11-8 11s-8-6.5-8-11a8 8 0 1 1 16 0z" fill="#1E1E1E" stroke="${color}" stroke-width="2"/>
          <circle cx="12" cy="10" r="3" fill="${color}"/>
          <text x="12" y="16.5" text-anchor="middle" font-size="7" font-weight="bold" fill="${color}">${location.total}</text>
        </svg>
      `;
      
      const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgIcon)}`;
      el.style.backgroundImage = `url('${dataUrl}')`;
      el.style.backgroundSize = '100%';
      el.style.transition = 'box-shadow 0.3s ease';
      
      // Add hover effects without movement - just change border glow
      el.addEventListener('mouseenter', () => {
        el.style.boxShadow = `0 0 0 3px ${color}40, 0 0 0 1px ${color}`;
      });
      
      el.addEventListener('mouseleave', () => {
        el.style.boxShadow = '0 0 0 2px rgba(0,0,0,0.25)';
      });
      
      return el;
    };

    // Add markers for each location
    locations.forEach(location => {
      const el = createMarkerElement(location);
      
      // Create and style popup
      const popup = new mapboxgl.Popup({ 
        offset: 25,
        closeButton: false,
        className: 'custom-popup'
      }).setHTML(`
        <div class="p-1">
          <h3 class="font-semibold text-sm">${location.name}</h3>
          <p class="text-xs text-accent">${location.total} ${location.total === 1 ? 'item' : 'items'}</p>
        </div>
      `);
      
      // Create marker and add to map
      const marker = new mapboxgl.Marker(el)
        .setLngLat(location.coordinates)
        .setPopup(popup)
        .addTo(map);
      
      // Add click handler
      el.addEventListener('click', () => {
        onMarkerClick(location);
      });
      
      // Store marker reference for cleanup
      markersRef.current.push(marker);
    });

    // Cleanup function
    return () => {
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
    };
  }, [map, locations, onMarkerClick]);

  // This component doesn't render anything directly
  return null;
};

export default MapMarkers;