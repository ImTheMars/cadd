import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Driver } from '../types/driver.types';
import { Truck } from 'lucide-react';

// Set Mapbox access token
mapboxgl.accessToken = 'pk.eyJ1Ijoic2FtY2hpc2ljayIsImEiOiJjbTk5a3pweHcwZTJlMm1vYjNzeGoxbGgwIn0.HMaDZt0ucB2DsnrJS7nMVw';

interface MapboxMapProps {
  drivers: Driver[];
  onDriverClick?: (driver: Driver) => void;
  height?: string;
  width?: string;
  center?: [number, number];
  zoom?: number;
}

const MapboxMap: React.FC<MapboxMapProps> = ({
  drivers,
  onDriverClick,
  height = '400px',
  width = '100%',
  center = [-117.8311, 33.7175], // Default to Orange County, CA
  zoom = 9
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center,
      zoom
    });

    map.current.on('load', () => {
      setMapLoaded(true);
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Add markers for drivers
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Create markers for each driver
    drivers.forEach(driver => {
      if (!driver.current_location) return;

      // Create custom marker element
      const el = document.createElement('div');
      el.className = 'driver-marker';
      el.style.width = '40px';
      el.style.height = '40px';
      el.style.borderRadius = '50%';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      
      // Set color based on driver status
      let bgColor = 'rgba(74, 222, 128, 0.2)'; // Default green for active
      let textColor = 'rgb(134, 239, 172)';
      
      if (driver.driver_status === 'on-delivery') {
        bgColor = 'rgba(59, 130, 246, 0.2)';
        textColor = 'rgb(147, 197, 253)';
      } else if (driver.driver_status === 'off-duty') {
        bgColor = 'rgba(156, 163, 175, 0.2)';
        textColor = 'rgb(209, 213, 219)';
      } else if (driver.driver_status === 'on-break') {
        bgColor = 'rgba(234, 179, 8, 0.2)';
        textColor = 'rgb(253, 224, 71)';
      }
      
      el.style.backgroundColor = bgColor;
      el.style.color = textColor;
      el.style.border = `2px solid ${textColor}`;
      el.style.transition = 'all 0.3s ease';
      el.style.cursor = 'pointer';
      
      // Add truck icon
      const truckIcon = document.createElement('div');
      truckIcon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 17h4V5H2v12h3"/><path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5"/><path d="M14 17h1"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>';
      el.appendChild(truckIcon);
      
      // Add hover effects
      el.addEventListener('mouseenter', () => {
        el.style.transform = 'scale(1.1)';
        el.style.boxShadow = `0 0 0 4px ${textColor}40`;
      });
      
      el.addEventListener('mouseleave', () => {
        el.style.transform = 'scale(1)';
        el.style.boxShadow = 'none';
      });
      
      // Create popup
      const popup = new mapboxgl.Popup({
        offset: 25,
        closeButton: false,
        className: 'driver-popup'
      }).setHTML(`
        <div class="p-2">
          <h3 class="font-semibold text-sm">${driver.full_name}</h3>
          <p class="text-xs text-accent">${driver.driver_status ? driver.driver_status.replace('-', ' ') : 'Active'}</p>
          ${driver.phone ? `<p class="text-xs">${driver.phone}</p>` : ''}
        </div>
      `);
      
      // Create marker
      const marker = new mapboxgl.Marker(el)
        .setLngLat([
          driver.current_location.longitude,
          driver.current_location.latitude
        ])
        .setPopup(popup)
        .addTo(map.current!);
      
      // Add click handler
      if (onDriverClick) {
        el.addEventListener('click', () => {
          onDriverClick(driver);
        });
      }
      
      // Store marker for cleanup
      markersRef.current.push(marker);
    });
    
    // Fit bounds to include all markers if there are any
    if (markersRef.current.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      
      drivers.forEach(driver => {
        if (driver.current_location) {
          bounds.extend([
            driver.current_location.longitude,
            driver.current_location.latitude
          ]);
        }
      });
      
      map.current.fitBounds(bounds, {
        padding: 50,
        maxZoom: 15
      });
    }
  }, [drivers, mapLoaded, onDriverClick]);

  return (
    <div style={{ height, width }} className="relative">
      <div ref={mapContainer} className="absolute inset-0 rounded-lg overflow-hidden" />
      {drivers.filter(d => d.current_location).length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center flex-col bg-gray-800/50 rounded-lg">
          <Truck className="h-12 w-12 text-accent mb-4" />
          <p className="text-text-secondary">No active drivers with location data</p>
        </div>
      )}
    </div>
  );
};

export default MapboxMap;
