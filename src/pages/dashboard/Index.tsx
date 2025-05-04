import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import DashboardSummary from '../../components/DashboardSummary';
import DashboardLayout from '../../components/DashboardLayout';
import { supabase } from '../../lib/supabase';
import { Order, Profile } from '../../types/database.types';

// Using the provided Mapbox access token
mapboxgl.accessToken = 'pk.eyJ1Ijoic2FtY2hpc2ljayIsImEiOiJjbTk5a3pweHcwZTJlMm1vYjNzeGoxbGgwIn0.HMaDZt0ucB2DsnrJS7nMVw';

interface Location {
  id: number;
  name: string;
  coordinates: [number, number];
}

interface OrderMarker {
  id: number;
  customer: string;
  address: string;
  coordinates: [number, number];
  status: string;
  price: number;
}

interface DriverMarker {
  id: string;
  name: string;
  coordinates: [number, number];
  status: string;
  vehicle: string;
  lastUpdate: string;
}

const DashboardIndex = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [pendingOrders, setPendingOrders] = useState<OrderMarker[]>([]);
  const [assignedOrders, setAssignedOrders] = useState<OrderMarker[]>([]);
  const [drivers, setDrivers] = useState<DriverMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Convert address to coordinates (mock implementation)
  const geocodeAddress = (address: string): [number, number] => {
    // In a real application, you would call a geocoding API
    // For now, we'll generate some random coordinates in the OC area
    const baseLat = 33.7175;
    const baseLng = -117.8731;
    
    // Generate a random offset (±0.05 degrees, roughly 3-4 miles)
    const latOffset = (Math.random() - 0.5) * 0.1;
    const lngOffset = (Math.random() - 0.5) * 0.1;
    
    return [baseLng + lngOffset, baseLat + latOffset];
  };

  // Load orders and drivers from Supabase
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch pending orders
        const { data: pendingOrdersData, error: pendingOrdersError } = await supabase
          .from('orders')
          .select('*')
          .eq('status', 'PENDING');
        
        if (pendingOrdersError) throw pendingOrdersError;
        
        // Fetch assigned orders
        const { data: assignedOrdersData, error: assignedOrdersError } = await supabase
          .from('orders')
          .select('*')
          .eq('status', 'ASSIGNED');
        
        if (assignedOrdersError) throw assignedOrdersError;
        
        // Fetch active drivers - Using profiles table with driver role filter
        const { data: driversData, error: driversError } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'driver')
          .eq('is_driver_active', true);
        
        if (driversError) throw driversError;
        
        // Process pending orders
        const pendingOrderMarkers: OrderMarker[] = (pendingOrdersData || []).map((order: Order) => ({
          id: order.id,
          customer: order.snapchat_username_at_order,
          address: order.address,
          coordinates: geocodeAddress(order.address),
          status: order.status,
          price: order.total_price
        }));
        
        // Process assigned orders
        const assignedOrderMarkers: OrderMarker[] = (assignedOrdersData || []).map((order: Order) => ({
          id: order.id,
          customer: order.snapchat_username_at_order,
          address: order.address,
          coordinates: geocodeAddress(order.address),
          status: order.status,
          price: order.total_price
        }));
        
        // Process drivers
        const driverMarkers: DriverMarker[] = (driversData || []).map((driver: Profile) => {
          // Generate random coordinates for drivers
          const coordinates = geocodeAddress('random');
          
          return {
            id: driver.id,
            name: driver.full_name || 'Unknown Driver',
            coordinates,
            status: 'active', // Default status
            vehicle: 'Vehicle', // Default vehicle
            lastUpdate: driver.updated_at || ''
          };
        });
        
        // Update state
        setPendingOrders(pendingOrderMarkers);
        setAssignedOrders(assignedOrderMarkers);
        setDrivers(driverMarkers);
        
        // No longer updating sample location markers
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load map data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
    
    // Set up real-time listeners
    const ordersSubscription = supabase
      .channel('orders-changes')
      .on('postgres_changes', { 
        event: '*',
        schema: 'public', 
        table: 'orders' 
      }, payload => {
        console.log('Orders changed:', payload);
        // Re-fetch orders when there's a change
        fetchData();
      })
      .subscribe();
    
    const driversSubscription = supabase
      .channel('drivers-changes')
      .on('postgres_changes', { 
        event: '*',
        schema: 'public', 
        table: 'profiles' 
      }, payload => {
        console.log('Drivers changed:', payload);
        // Re-fetch drivers when there's a change
        fetchData();
      })
      .subscribe();
    
    // Clean up subscriptions
    return () => {
      supabase.removeChannel(ordersSubscription);
      supabase.removeChannel(driversSubscription);
    };
  }, []);

  // Initialize map
  useEffect(() => {
    if (map.current) return; // Initialize map only once
    
    if (mapContainer.current) {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [-117.8731, 33.7175], // Default to Orange County coordinates
        zoom: 10,
        pitchWithRotate: false,
        attributionControl: false
      });

      // Add navigation controls with custom position
      map.current.addControl(new mapboxgl.NavigationControl({
        showCompass: true,
        visualizePitch: true
      }), 'bottom-right');
      
      // Add fullscreen control
      map.current.addControl(new mapboxgl.FullscreenControl(), 'bottom-right');
      
      // Add scale control
      map.current.addControl(new mapboxgl.ScaleControl({
        maxWidth: 100,
        unit: 'imperial'
      }), 'bottom-left');
      
      // Add some map interaction improvements
      map.current.on('load', () => {
        // Add subtle terrain and buildings for better visual appeal
        map.current?.setFog({
          'range': [1, 12],
          'color': '#242424',
          'horizon-blend': 0.1
        });
      });
    }
  }, []);
  
  return (
    <DashboardLayout>
      <div className="relative w-full h-screen overflow-hidden">
        {loading && (
          <div className="absolute top-0 left-0 right-0 bottom-0 flex items-center justify-center z-20 bg-background-dark/50 backdrop-blur-sm">
            <div className="p-6 bg-background rounded-lg shadow-lg text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-accent border-r-2 border-b-transparent mx-auto mb-4"></div>
              <p className="text-text-primary">Loading map data...</p>
            </div>
          </div>
        )}
        
        {error && (
          <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-20 bg-red-900/90 text-red-100 px-4 py-2 rounded-lg shadow-lg">
            <p>{error}</p>
          </div>
        )}
        
        {/* Mapbox container */}
        <div ref={mapContainer} className="absolute inset-0 w-full h-full" />
        
        {/* Map Markers */}
        {map.current && (
          <>
            {/* Render order markers - only actual orders */}
            {pendingOrders.length > 0 && (
              <OrderMapMarkers
                map={map.current}
                orders={pendingOrders}
                status="PENDING"
              />
            )}
            
            {assignedOrders.length > 0 && (
              <OrderMapMarkers
                map={map.current}
                orders={assignedOrders}
                status="ASSIGNED"
              />
            )}
            
            {/* Render driver markers */}
            {drivers.length > 0 && (
              <DriverMapMarkers
                map={map.current}
                drivers={drivers}
              />
            )}
          </>
        )}
        
        {/* Summary box with improved positioning */}
        <div className="absolute top-6 left-6 z-10">
          <DashboardSummary />
        </div>
      </div>
    </DashboardLayout>
  );
};

// OrderMapMarkers component for rendering order markers
const OrderMapMarkers: React.FC<{ map: mapboxgl.Map, orders: OrderMarker[], status: string }> = ({ map, orders, status }) => {
  useEffect(() => {
    // Create marker elements for orders
    const markers: mapboxgl.Marker[] = [];
    
    orders.forEach(order => {
      // Create custom marker element
      const el = document.createElement('div');
      el.className = 'order-marker';
      
      // Define status colors and icons
      const statusConfig: Record<string, { color: string, icon: string, label: string }> = {
        'PENDING': { 
          color: '#FFD700', 
          icon: `
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FFD700" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          `,
          label: 'Pending'
        },
        'ASSIGNED': { 
          color: '#4169E1', 
          icon: `
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4169E1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="8.5" cy="7" r="4"/>
              <polyline points="17 11 19 13 23 9"/>
            </svg>
          `,
          label: 'Assigned'
        },
        'ENROUTE': { 
          color: '#9932CC', 
          icon: `
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9932CC" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="1" y="3" width="15" height="13"/>
              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
              <circle cx="5.5" cy="18.5" r="2.5"/>
              <circle cx="18.5" cy="18.5" r="2.5"/>
            </svg>
          `,
          label: 'En Route'
        },
        'DELIVERED': { 
          color: '#32CD32', 
          icon: `
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#32CD32" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          `,
          label: 'Delivered'
        },
        'CANCELLED': { 
          color: '#DC143C', 
          icon: `
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#DC143C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          `,
          label: 'Cancelled'
        }
      };
      
      // Get config for current status or use default
      const config = statusConfig[status] || statusConfig['PENDING'];
      
      // Set styles - no transform on hover to keep markers sticky
      el.style.width = '28px';
      el.style.height = '28px';
      el.style.borderRadius = '50%';
      el.style.background = '#1E1E1E';
      el.style.border = `2px solid ${config.color}`;
      el.style.boxShadow = '0 0 0 2px rgba(0,0,0,0.25)';
      el.style.cursor = 'pointer';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      
      // Create icon container
      const iconContainer = document.createElement('div');
      iconContainer.innerHTML = config.icon;
      el.appendChild(iconContainer);
      
      // Add hover effect without movement - just change border glow
      el.addEventListener('mouseenter', () => {
        el.style.boxShadow = `0 0 0 3px ${config.color}40, 0 0 0 1px ${config.color}`;
      });
      
      el.addEventListener('mouseleave', () => {
        el.style.boxShadow = '0 0 0 2px rgba(0,0,0,0.25)';
      });
      
      // Create enhanced popup with better styling
      const popup = new mapboxgl.Popup({
        offset: 25,
        closeButton: false,
        className: 'custom-popup'
      }).setHTML(`
        <div class="p-3 max-w-xs">
          <div class="flex items-center justify-between mb-2">
            <h3 class="font-semibold text-sm">Order #${order.id}</h3>
            <span class="px-2 py-0.5 rounded-full text-xs" style="background-color: ${config.color}30; color: ${config.color}">
              ${config.label}
            </span>
          </div>
          <div class="text-sm font-bold text-accent mb-2">$${order.price.toFixed(2)}</div>
          <div class="border-t border-gray-700 my-2"></div>
          <div class="mb-1">
            <p class="text-xs font-semibold">Customer:</p>
            <p class="text-xs">${order.customer}</p>
          </div>
          <div>
            <p class="text-xs font-semibold">Address:</p>
            <p class="text-xs text-text-secondary">${order.address}</p>
          </div>
        </div>
      `);
      
      // Create and add marker
      const marker = new mapboxgl.Marker(el)
        .setLngLat(order.coordinates)
        .setPopup(popup)
        .addTo(map);
      
      markers.push(marker);
    });
    
    // Cleanup
    return () => {
      markers.forEach(marker => marker.remove());
    };
  }, [map, orders, status]);
  
  return null;
};

// DriverMapMarkers component for rendering driver markers
const DriverMapMarkers: React.FC<{ map: mapboxgl.Map, drivers: DriverMarker[] }> = ({ map, drivers }) => {
  useEffect(() => {
    // Create marker elements for drivers
    const markers: mapboxgl.Marker[] = [];
    
    drivers.forEach(driver => {
      // Create custom marker element
      const el = document.createElement('div');
      el.className = 'driver-marker';
      
      // Define driver status configurations
      const statusConfig: Record<string, { color: string, icon: string, label: string }> = {
        'active': { 
          color: '#32CD32', 
          icon: `
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#32CD32" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          `,
          label: 'Active'
        },
        'on-delivery': { 
          color: '#4169E1', 
          icon: `
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4169E1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
              <rect x="1" y="3" width="7" height="5" rx="1" transform="translate(15, 0) scale(0.6)" />
            </svg>
          `,
          label: 'On Delivery'
        },
        'off-duty': { 
          color: '#A9A9A9', 
          icon: `
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A9A9A9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
              <line x1="18" y1="6" x2="6" y2="18" transform="translate(0, -3) scale(0.6)" />
            </svg>
          `,
          label: 'Off Duty'
        },
        'on-break': { 
          color: '#FFD700', 
          icon: `
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFD700" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
              <path d="M12 18 L12 22" transform="translate(-6, -12) scale(0.6)" />
              <path d="M12 18 L16 18" transform="translate(-6, -12) scale(0.6)" />
            </svg>
          `,
          label: 'On Break'
        }
      };
      
      // Get config for current status or use default
      const config = statusConfig[driver.status] || statusConfig['active'];
      
      // Set styles - no transform on hover to keep markers sticky
      el.style.width = '32px';
      el.style.height = '32px';
      el.style.borderRadius = '50%';
      el.style.background = '#1E1E1E';
      el.style.border = `2px solid ${config.color}`;
      el.style.boxShadow = '0 0 0 2px rgba(0,0,0,0.25)';
      el.style.cursor = 'pointer';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      
      // Create user icon inside marker
      const iconDiv = document.createElement('div');
      iconDiv.innerHTML = config.icon;
      el.appendChild(iconDiv);
      
      // Add hover effect without movement - just change border glow
      el.addEventListener('mouseenter', () => {
        el.style.boxShadow = `0 0 0 3px ${config.color}40, 0 0 0 1px ${config.color}`;
      });
      
      el.addEventListener('mouseleave', () => {
        el.style.boxShadow = '0 0 0 2px rgba(0,0,0,0.25)';
      });
      
      // Format time for popup
      const formatTime = (timestamp: string) => {
        if (!timestamp) return 'Never';
        try {
          const date = new Date(timestamp);
          return date.toLocaleString();
        } catch (e) {
          return 'Invalid date';
        }
      };
      
      // Create enhanced popup with better styling
      const popup = new mapboxgl.Popup({
        offset: 25,
        closeButton: false,
        className: 'custom-popup'
      }).setHTML(`
        <div class="p-3 max-w-xs">
          <div class="flex items-center justify-between mb-2">
            <h3 class="font-semibold text-sm">${driver.name}</h3>
            <span class="px-2 py-0.5 rounded-full text-xs" style="background-color: ${config.color}30; color: ${config.color}">
              ${config.label}
            </span>
          </div>
          
          <div class="border-t border-gray-700 my-2"></div>
          
          <div class="grid grid-cols-2 gap-2 text-xs">
            <div>
              <p class="font-semibold">Vehicle:</p>
              <p>${driver.vehicle || 'Not assigned'}</p>
            </div>
            <div>
              <p class="font-semibold">Last Update:</p>
              <p class="text-text-secondary">${formatTime(driver.lastUpdate)}</p>
            </div>
          </div>
        </div>
      `);
      
      // Create and add marker
      const marker = new mapboxgl.Marker(el)
        .setLngLat(driver.coordinates)
        .setPopup(popup)
        .addTo(map);
      
      markers.push(marker);
    });
    
    // Cleanup
    return () => {
      markers.forEach(marker => marker.remove());
    };
  }, [map, drivers]);
  
  return null;
};

export default DashboardIndex;