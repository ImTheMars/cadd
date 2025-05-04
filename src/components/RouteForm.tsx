import React, { useState, useEffect } from 'react';
import { Map, Save, AlertTriangle, User, MapPin } from 'lucide-react';
import Button from './ui/Button';
import Input from './ui/Input';
import MapboxAddressAutocomplete from './MapboxAddressAutocomplete';
import { supabase } from '../lib/supabase';
import { Route, Profile, Order } from '../types/database.types';

interface RouteFormProps {
  routeId?: string;
  onSave: () => void;
  onCancel: () => void;
}

const RouteForm: React.FC<RouteFormProps> = ({ routeId, onSave, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drivers, setDrivers] = useState<Profile[]>([]);
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [selectedOrders, setSelectedOrders] = useState<number[]>([]);
  const [formData, setFormData] = useState<Partial<Route>>({
    name: '',
    driver_id: '',
    status: 'scheduled',
    start_address: '',
    notes: '',
    estimated_completion_time: new Date(
      new Date().getTime() + 24 * 60 * 60 * 1000
    ).toISOString().slice(0, 16),
  });

  useEffect(() => {
    const fetchDrivers = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'driver')
          .eq('is_driver_active', true);

        if (error) throw error;
        setDrivers(data || []);
      } catch (err) {
        console.error('Error fetching drivers:', err);
        setError('Failed to load available drivers');
      }
    };

    const fetchPendingOrders = async () => {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('status', 'PENDING')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setPendingOrders(data || []);
      } catch (err) {
        console.error('Error fetching pending orders:', err);
        setError('Failed to load pending orders');
      }
    };

    const fetchRoute = async () => {
      if (!routeId) return;

      try {
        setLoading(true);
        const { data: route, error: routeError } = await supabase
          .from('routes')
          .select('*')
          .eq('id', routeId)
          .single();

        if (routeError) throw routeError;
        
        if (route) {
          // Format the date for datetime-local input
          const estimatedTime = route.estimated_completion_time 
            ? new Date(route.estimated_completion_time).toISOString().slice(0, 16)
            : '';

          setFormData({
            ...route,
            estimated_completion_time: estimatedTime,
          });

          // Fetch route orders to get the selected orders
          const { data: routeOrders, error: ordersError } = await supabase
            .from('route_orders')
            .select('order_id')
            .eq('route_id', routeId)
            .order('stop_number', { ascending: true });

          if (ordersError) throw ordersError;
          setSelectedOrders(routeOrders.map(ro => ro.order_id));
        }
      } catch (err) {
        console.error('Error fetching route:', err);
        setError('Failed to load route details');
      } finally {
        setLoading(false);
      }
    };

    fetchDrivers();
    fetchPendingOrders();
    fetchRoute();
  }, [routeId]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const toggleOrderSelection = (orderId: number) => {
    setSelectedOrders(prev => 
      prev.includes(orderId)
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (selectedOrders.length === 0) {
      setError('You must select at least one order for the route');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const routeData = {
        name: formData.name,
        driver_id: formData.driver_id,
        status: formData.status,
        start_address: formData.start_address,
        estimated_completion_time: formData.estimated_completion_time,
        notes: formData.notes,
      };

      let routeResult;
      let newRouteId = routeId;

      if (routeId) {
        // Update existing route
        routeResult = await supabase
          .from('routes')
          .update(routeData)
          .eq('id', routeId);
      } else {
        // Insert new route
        routeResult = await supabase
          .from('routes')
          .insert(routeData)
          .select();
        
        if (routeResult.data && routeResult.data.length > 0) {
          newRouteId = routeResult.data[0].id;
        }
      }

      if (routeResult.error) throw routeResult.error;
      
      if (newRouteId) {
        // If it's an existing route, clear all current route_orders
        if (routeId) {
          const { error: deleteError } = await supabase
            .from('route_orders')
            .delete()
            .eq('route_id', routeId);
          
          if (deleteError) throw deleteError;
        }
        
        // Create route_orders for each selected order
        const routeOrders = selectedOrders.map((orderId, index) => ({
          route_id: newRouteId,
          order_id: orderId,
          stop_number: index + 1,
          status: 'pending',
        }));
        
        const { error: insertError } = await supabase
          .from('route_orders')
          .insert(routeOrders);
        
        if (insertError) throw insertError;
        
        // Update orders status to ASSIGNED
        const { error: updateOrderError } = await supabase
          .from('orders')
          .update({ status: 'ASSIGNED' })
          .in('id', selectedOrders);
        
        if (updateOrderError) throw updateOrderError;
      }
      
      onSave();
    } catch (err) {
      console.error('Error saving route:', err);
      setError('Failed to save route');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-6 flex items-center">
        <Map className="h-5 w-5 mr-2 text-accent" />
        {routeId ? 'Edit Route' : 'Create New Route'}
      </h2>

      {error && (
        <div className="mb-6 p-4 bg-red-900/20 border border-red-500 text-red-300 rounded-md flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2" />
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Input
            label="Route Name"
            name="name"
            value={formData.name || ''}
            onChange={handleChange}
            placeholder="e.g., Morning Route #1"
            required
          />
          
          <div>
            <label className="block mb-2 text-sm font-medium text-text-primary">
              Assign Driver
            </label>
            <select
              name="driver_id"
              value={formData.driver_id || ''}
              onChange={handleChange}
              className="w-full bg-background-light border-2 border-background-light rounded-md p-2 text-text-primary focus:outline-none focus:border-accent"
              required
            >
              <option value="">Select a driver...</option>
              {drivers.map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.full_name || 'Unnamed Driver'}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <MapboxAddressAutocomplete
              label="Start Address"
              value={formData.start_address || ''}
              onChange={(address, coordinates) => {
                setFormData(prev => ({
                  ...prev,
                  start_address: address,
                  start_coordinates: coordinates ? {
                    latitude: coordinates[1],
                    longitude: coordinates[0]
                  } : undefined
                }));
              }}
              placeholder="Starting location address"
              required
            />
          </div>
          
          <div>
            <label className="block mb-2 text-sm font-medium text-text-primary">
              Route Status
            </label>
            <select
              name="status"
              value={formData.status || 'scheduled'}
              onChange={handleChange}
              className="w-full bg-background-light border-2 border-background-light rounded-md p-2 text-text-primary focus:outline-none focus:border-accent"
              required
            >
              <option value="scheduled">Scheduled</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="delayed">Delayed</option>
            </select>
          </div>
          
          <Input
            label="Estimated Completion"
            name="estimated_completion_time"
            type="datetime-local"
            value={formData.estimated_completion_time || ''}
            onChange={handleChange}
            required
          />
        </div>

        <div className="mb-6">
          <label className="block mb-2 text-sm font-medium text-text-primary">
            Notes
          </label>
          <textarea
            name="notes"
            value={formData.notes || ''}
            onChange={handleChange}
            className="w-full bg-background-light border-2 border-background-light rounded-md p-2 text-text-primary resize-none focus:outline-none focus:border-accent"
            rows={3}
            placeholder="Any special instructions or notes for this route..."
          ></textarea>
        </div>

        <div className="mb-6">
          <h3 className="text-md font-semibold mb-3 flex items-center">
            <ShoppingBag className="h-4 w-4 mr-2 text-accent" />
            Select Orders for this Route ({selectedOrders.length} selected)
          </h3>
          
          {pendingOrders.length === 0 ? (
            <div className="p-4 text-center text-text-secondary bg-background-light rounded-lg">
              No pending orders available
            </div>
          ) : (
            <div className="max-h-60 overflow-y-auto border border-background-light rounded-lg">
              {pendingOrders.map((order) => (
                <div 
                  key={order.id}
                  className={`p-3 flex items-center justify-between border-b border-background-light cursor-pointer ${
                    selectedOrders.includes(order.id) ? 'bg-accent/10' : ''
                  }`}
                  onClick={() => toggleOrderSelection(order.id)}
                >
                  <div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedOrders.includes(order.id)}
                        onChange={() => {}}
                        className="mr-3 h-4 w-4"
                      />
                      <span className="font-medium">Order #{order.id}</span>
                    </div>
                    <div className="text-xs text-text-secondary mt-1 ml-7 flex items-center">
                      <User className="h-3 w-3 mr-1" />
                      {order.snapchat_username_at_order}
                    </div>
                    <div className="text-xs text-text-secondary mt-1 ml-7 flex items-center">
                      <MapPin className="h-3 w-3 mr-1" />
                      {order.address}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-accent font-medium">
                      ${order.total_price.toFixed(2)}
                    </div>
                    <div className="text-xs text-text-secondary mt-1">
                      Created: {new Date(order.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={loading}
            disabled={loading || selectedOrders.length === 0}
          >
            <Save className="h-4 w-4 mr-2" />
            {routeId ? 'Update Route' : 'Create Route'}
          </Button>
        </div>
      </form>
    </div>
  );
};

// Add Missing ShoppingBag icon
function ShoppingBag({ className }: { className: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
      <line x1="3" y1="6" x2="21" y2="6"></line>
      <path d="M16 10a4 4 0 0 1-8 0"></path>
    </svg>
  );
}

export default RouteForm;