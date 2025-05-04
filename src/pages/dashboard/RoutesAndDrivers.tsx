import { useState, useEffect } from 'react';
import { Search, Filter, Truck, ShieldCheck, Calendar, MapPin, Clock, ArrowDown, ArrowUp, UserPlus, Map as MapIcon, Users, Edit2, RefreshCw, MapPin as MapPinIcon, Trash2, Eye, Phone, User, X, AlertTriangle } from 'lucide-react';
import MapboxMap from '../../components/MapboxMap';
import DashboardLayout from '../../components/DashboardLayout';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { supabase } from '../../lib/supabase';
import { Route, Order } from '../../types/database.types';
import { Driver } from '../../types/driver.types';
import DriverForm from '../../components/DriverForm';
import RouteForm from '../../components/RouteForm';
import DriverManager from '../../components/DriverManager';
import { formatDistanceToNow, format } from 'date-fns';
import { fetchAllDrivers } from '../../lib/driverService';

const RoutesAndDriversPage = () => {
  const [activeTab, setActiveTab] = useState<'drivers' | 'routes'>('drivers');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<string>(activeTab === 'drivers' ? 'updated_at' : 'estimated_completion_time');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filterStatus, setFilterStatus] = useState<string | 'all'>('all');
  
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [routes, setRoutes] = useState<(Route & { driver: Driver, order_count: number })[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [showDriverForm, setShowDriverForm] = useState(false);
  const [showRouteForm, setShowRouteForm] = useState(false);
  const [editDriverId, setEditDriverId] = useState<string | undefined>(undefined);
  const [editRouteId, setEditRouteId] = useState<string | undefined>(undefined);
  
  // Driver details modal
  const [showDriverDetails, setShowDriverDetails] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  
  // Map view
  const [showMap, setShowMap] = useState(false);
  
  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [driverToDelete, setDriverToDelete] = useState<string | null>(null);
  
  // Driver orders
  const [driverOrders, setDriverOrders] = useState<Record<string, any[]>>({});

  useEffect(() => {
    if (activeTab === 'drivers') {
      fetchDrivers();
      fetchDriverOrders();
      
      // Add mock location data for testing if not already present
      setTimeout(() => {
        setDrivers(prevDrivers => {
          if (!prevDrivers.some(d => d.current_location)) {
            return prevDrivers.map(driver => {
              if (driver.is_driver_active && !driver.current_location) {
                // Generate random locations around San Francisco for demo
                const baseLatitude = 37.7749;
                const baseLongitude = -122.4194;
                const randomOffset = () => (Math.random() - 0.5) * 0.1;
                
                return {
                  ...driver,
                  current_location: {
                    latitude: baseLatitude + randomOffset(),
                    longitude: baseLongitude + randomOffset(),
                    last_updated: new Date().toISOString()
                  }
                };
              }
              return driver;
            });
          }
          return prevDrivers;
        });
      }, 500);
    } else {
      fetchRoutes();
    }
  }, [activeTab]);

  const fetchDrivers = async () => {
    try {
      setLoading(true);
      
      // Use our new service that fetches drivers from Clerk + Supabase
      const driversData = await fetchAllDrivers();
      
      // Add default status if missing
      const driversWithStatus = driversData.map(driver => ({
        ...driver,
        driver_status: driver.driver_status || 'active'
      }));
      
      setDrivers(driversWithStatus);
    } catch (err) {
      console.error('Error fetching drivers:', err);
      setError('Failed to load drivers data');
    } finally {
      setLoading(false);
    }
  };
  
  // Extended Order type with customer data from join
  interface OrderWithCustomer extends Order {
    customer?: {
      snapchat_username: string;
      [key: string]: any;
    };
  }

  const fetchDriverOrders = async () => {
    try {
      const { data: orders, error } = await supabase
        .from('orders')
        .select('*, customer:customer_id(*)')
        .not('driver_id', 'is', null);
        
      if (error) throw error;
      
      // Group orders by driver
      const ordersByDriver: Record<string, OrderWithCustomer[]> = {};
      (orders || []).forEach((order: OrderWithCustomer) => {
        if (order.driver_id) {
          if (!ordersByDriver[order.driver_id]) {
            ordersByDriver[order.driver_id] = [];
          }
          ordersByDriver[order.driver_id].push(order);
        }
      });
      
      setDriverOrders(ordersByDriver);
    } catch (err) {
      console.error('Error fetching driver orders:', err);
    }
  };

  const fetchRoutes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('routes')
        .select(`
          *,
          driver:profiles(*),
          route_orders(*)
        `);

      if (error) throw error;
      
      // Process data to include order count
      const routesWithCounts = data.map(route => ({
        ...route,
        order_count: route.route_orders ? route.route_orders.length : 0
      }));
      
      setRoutes(routesWithCounts);
    } catch (err) {
      console.error('Error fetching routes:', err);
      setError('Failed to load routes data');
    } finally {
      setLoading(false);
    }
  };
  
  // Status styles and icons
  const driverStatusInfo = {
    'active': { color: 'bg-green-500/20 text-green-300', icon: <ShieldCheck className="h-3.5 w-3.5 mr-1" /> },
    'on-delivery': { color: 'bg-blue-500/20 text-blue-300', icon: <Truck className="h-3.5 w-3.5 mr-1" /> },
    'off-duty': { color: 'bg-gray-500/20 text-gray-300', icon: <Clock className="h-3.5 w-3.5 mr-1" /> },
    'on-break': { color: 'bg-yellow-500/20 text-yellow-300', icon: <Calendar className="h-3.5 w-3.5 mr-1" /> }
  };
  
  const routeStatusInfo = {
    'scheduled': { color: 'bg-yellow-500/20 text-yellow-300', icon: <Calendar className="h-3.5 w-3.5 mr-1" /> },
    'in-progress': { color: 'bg-blue-500/20 text-blue-300', icon: <Truck className="h-3.5 w-3.5 mr-1" /> },
    'completed': { color: 'bg-green-500/20 text-green-300', icon: <ShieldCheck className="h-3.5 w-3.5 mr-1" /> },
    'delayed': { color: 'bg-red-500/20 text-red-300', icon: <Clock className="h-3.5 w-3.5 mr-1" /> }
  };
  
  const formatStatus = (status: string) => {
    return status.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };
  
  const formatDateTime = (dateTimeString: string) => {
    if (!dateTimeString) return { date: 'N/A', time: '' };
    
    try {
      const date = new Date(dateTimeString);
      return {
        date: format(date, 'MMM d, yyyy'),
        time: format(date, 'h:mm a')
      };
    } catch (e) {
      return { date: 'Invalid date', time: '' };
    }
  };
  
  const formatRelativeTime = (dateTimeString: string) => {
    if (!dateTimeString) return 'Never';
    
    try {
      return formatDistanceToNow(new Date(dateTimeString), { addSuffix: true });
    } catch (e) {
      return 'Invalid date';
    }
  };
  
  const handleSort = (field: string) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  // Filter and sort data based on active tab
  const filteredDrivers = drivers
    .filter(driver => 
      (filterStatus === 'all' || driver.role === filterStatus) && 
      (driver.full_name?.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => {
      if (sortField === 'updated_at') {
        const dateA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
        const dateB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
      }
      
      if (sortField === 'full_name') {
        const nameA = a.full_name || '';
        const nameB = b.full_name || '';
        return sortDirection === 'asc' 
          ? nameA.localeCompare(nameB)
          : nameB.localeCompare(nameA);
      }
      
      const valA = a[sortField as keyof typeof a] || '';
      const valB = b[sortField as keyof typeof b] || '';
      
      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortDirection === 'asc' 
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }
      
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  
  const filteredRoutes = routes
    .filter(route => 
      (filterStatus === 'all' || route.status === filterStatus) && 
      (route.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        route.driver?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => {
      if (sortField === 'estimated_completion_time' || sortField === 'created_at') {
        const dateA = a[sortField as keyof Route] ? new Date(a[sortField as keyof Route] as string).getTime() : 0;
        const dateB = b[sortField as keyof Route] ? new Date(b[sortField as keyof Route] as string).getTime() : 0;
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
      }
      
      if (sortField === 'driver.full_name') {
        const nameA = a.driver?.full_name || '';
        const nameB = b.driver?.full_name || '';
        return sortDirection === 'asc' 
          ? nameA.localeCompare(nameB)
          : nameB.localeCompare(nameA);
      }
      
      if (sortField === 'order_count') {
        return sortDirection === 'asc' 
          ? a.order_count - b.order_count
          : b.order_count - a.order_count;
      }
      
      const valA = a[sortField as keyof typeof a] || '';
      const valB = b[sortField as keyof typeof b] || '';
      
      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortDirection === 'asc' 
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }
      
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  
  const SortIcon = ({ field }: { field: string }) => {
    if (field !== sortField) return <ArrowDown className="h-3 w-3 opacity-30" />;
    return sortDirection === 'asc' ? 
      <ArrowUp className="h-3 w-3 text-accent" /> : 
      <ArrowDown className="h-3 w-3 text-accent" />;
  };
  
  const handleAddDriver = () => {
    setEditDriverId(undefined);
    setShowDriverForm(true);
  };
  
  const handleEditDriver = (id: string) => {
    setEditDriverId(id);
    setShowDriverForm(true);
  };
  
  const handleDriverFormSave = () => {
    setShowDriverForm(false);
    fetchDrivers();
  };
  
  const handleDriverFormCancel = () => {
    setShowDriverForm(false);
  };
  
  const handleViewDriver = (driver: Driver) => {
    setSelectedDriver(driver);
    setShowDriverDetails(true);
  };
  
  const handleDeleteDriver = (driverId: string) => {
    setDriverToDelete(driverId);
    setShowDeleteConfirm(true);
  };
  
  const confirmDeleteDriver = async () => {
    if (!driverToDelete) return;
    
    try {
      setLoading(true);
      
      // Check if driver has assigned orders
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id')
        .eq('driver_id', driverToDelete);
        
      if (ordersError) throw ordersError;
      
      if (orders && orders.length > 0) {
        setError(`Cannot delete driver with ${orders.length} assigned orders. Please reassign orders first.`);
        setShowDeleteConfirm(false);
        setDriverToDelete(null);
        setLoading(false);
        return;
      }
      
      // Check if driver has assigned routes
      const { data: routes, error: routesError } = await supabase
        .from('routes')
        .select('id')
        .eq('driver_id', driverToDelete);
        
      if (routesError) throw routesError;
      
      if (routes && routes.length > 0) {
        setError(`Cannot delete driver with ${routes.length} assigned routes. Please reassign routes first.`);
        setShowDeleteConfirm(false);
        setDriverToDelete(null);
        setLoading(false);
        return;
      }
      
      // Delete driver
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', driverToDelete);
        
      if (error) throw error;
      
      // Refresh drivers list
      fetchDrivers();
      setShowDeleteConfirm(false);
      setDriverToDelete(null);
    } catch (err) {
      console.error('Error deleting driver:', err);
      setError('Failed to delete driver');
    } finally {
      setLoading(false);
    }
  };
  
  const toggleMapView = () => {
    setShowMap(!showMap);
  };
  
  const handleAddRoute = () => {
    setEditRouteId(undefined);
    setShowRouteForm(true);
  };
  
  const handleEditRoute = (id: string) => {
    setEditRouteId(id);
    setShowRouteForm(true);
  };
  
  const handleRouteFormSave = () => {
    setShowRouteForm(false);
    fetchRoutes();
  };
  
  const handleRouteFormCancel = () => {
    setShowRouteForm(false);
  };
  
  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold flex items-center">
            <Truck className="h-6 w-6 mr-2 text-accent" />
            Routes & Drivers
          </h1>
          <div className="flex gap-3">
            {activeTab === 'drivers' ? (
              <Button 
                className="flex items-center"
                onClick={handleAddDriver}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add Driver
              </Button>
            ) : (
              <Button 
                className="flex items-center"
                onClick={handleAddRoute}
              >
                <MapIcon className="h-4 w-4 mr-2" />
                Create Route
              </Button>
            )}
          </div>
        </div>
        
        {/* Show forms as needed */}
        {showDriverForm && (
          <div className="mb-6">
            <DriverForm 
              driverId={editDriverId} 
              onSave={handleDriverFormSave} 
              onCancel={handleDriverFormCancel} 
            />
          </div>
        )}
        
        {showRouteForm && (
          <div className="mb-6">
            <RouteForm 
              routeId={editRouteId} 
              onSave={handleRouteFormSave} 
              onCancel={handleRouteFormCancel} 
            />
          </div>
        )}
        
        <div className="flex mb-6 border-b border-background-light">
          <button
            className={`py-3 px-6 font-medium text-sm relative ${
              activeTab === 'drivers' 
                ? 'text-accent after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-accent' 
                : 'text-text-secondary hover:text-text-primary'
            }`}
            onClick={() => {
              setActiveTab('drivers');
              setFilterStatus('all');
              setSearchTerm('');
              setSortField('updated_at');
              setSortDirection('desc');
            }}
          >
            <Users className="h-4 w-4 inline-block mr-2" />
            Drivers
          </button>
          <button
            className={`py-3 px-6 font-medium text-sm relative ${
              activeTab === 'routes' 
                ? 'text-accent after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-accent' 
                : 'text-text-secondary hover:text-text-primary'
            }`}
            onClick={() => {
              setActiveTab('routes');
              setFilterStatus('all');
              setSearchTerm('');
              setSortField('estimated_completion_time');
              setSortDirection('desc');
            }}
          >
            <MapIcon className="h-4 w-4 inline-block mr-2" />
            Routes
          </button>
          {activeTab === 'drivers' && (
            <button
              className="ml-auto py-3 px-6 font-medium text-sm text-accent hover:text-accent-hover flex items-center"
              onClick={toggleMapView}
            >
              <MapPinIcon className="h-4 w-4 mr-2" />
              {showMap ? 'Hide Map' : 'Show Map'}
            </button>
          )}
        </div>
        
        <div className="bg-background/70 backdrop-blur-lg rounded-lg shadow-lg mb-6 p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-secondary" />
              <Input
                type="text"
                placeholder={`Search ${activeTab === 'drivers' ? 'drivers' : 'routes'}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
            <div className="relative">
              <select
                className="bg-background-light border-2 border-background-light px-3 py-2 rounded-md text-text-primary appearance-none pr-9 focus:outline-none focus:border-accent"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All Statuses</option>
                {activeTab === 'drivers' ? (
                  <>
                    <option value="active">Active</option>
                    <option value="on-delivery">On Delivery</option>
                    <option value="off-duty">Off Duty</option>
                    <option value="on-break">On Break</option>
                  </>
                ) : (
                  <>
                    <option value="scheduled">Scheduled</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="delayed">Delayed</option>
                  </>
                )}
              </select>
              <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-secondary" />
            </div>
          </div>
        </div>
        
        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-500 text-red-300 rounded-md flex items-center">
            <p>{error}</p>
          </div>
        )}
        
        {/* Map View */}
        {showMap && activeTab === 'drivers' && !loading && (
          <div className="bg-background rounded-lg shadow-lg mb-6 overflow-hidden">
            <div className="p-4 border-b border-background-light flex justify-between items-center">
              <h3 className="font-medium">Driver Locations</h3>
              <Button variant="text" size="sm" onClick={toggleMapView}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <MapboxMap 
              drivers={drivers.filter(d => d.is_driver_active)} 
              height="400px"
              onDriverClick={handleViewDriver}
            />
          </div>
        )}
        
        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background rounded-lg shadow-lg p-6 max-w-md w-full">
              <div className="flex items-center mb-4 text-red-500">
                <AlertTriangle className="h-6 w-6 mr-2" />
                <h3 className="text-lg font-semibold">Confirm Deletion</h3>
              </div>
              <p className="mb-6">Are you sure you want to delete this driver? This action cannot be undone.</p>
              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDriverToDelete(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  className="bg-red-500 hover:bg-red-600"
                  onClick={confirmDeleteDriver}
                  isLoading={loading}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Driver
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {/* Driver Details Modal */}
        {showDriverDetails && selectedDriver && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background rounded-lg shadow-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mr-4 ${driverStatusInfo[selectedDriver.driver_status || 'active']?.color}`}>
                    <User className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">{selectedDriver.full_name}</h2>
                    <div className="flex items-center mt-1">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${driverStatusInfo[selectedDriver.driver_status || 'active']?.color}`}>
                        {driverStatusInfo[selectedDriver.driver_status || 'active']?.icon}
                        {selectedDriver.driver_status ? formatStatus(selectedDriver.driver_status) : 'Active'}
                      </span>
                      {selectedDriver.is_driver_active ? (
                        <span className="ml-2 text-green-300 text-xs">Available</span>
                      ) : (
                        <span className="ml-2 text-red-300 text-xs">Unavailable</span>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  variant="text"
                  onClick={() => setShowDriverDetails(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-background-light/30 p-4 rounded-lg">
                  <h3 className="font-medium mb-3 flex items-center">
                    <User className="h-4 w-4 mr-2 text-accent" />
                    Contact Information
                  </h3>
                  <div className="space-y-2">
                    {selectedDriver.phone && (
                      <div className="flex items-center">
                        <Phone className="h-4 w-4 mr-2 text-text-secondary" />
                        <span>{selectedDriver.phone}</span>
                      </div>
                    )}
                    {selectedDriver.email && (
                      <div className="flex items-center">
                        <svg className="h-4 w-4 mr-2 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span>{selectedDriver.email}</span>
                      </div>
                    )}
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-2 text-text-secondary" />
                      <span>Last updated {formatRelativeTime(selectedDriver.updated_at || new Date().toISOString())}</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-background-light/30 p-4 rounded-lg">
                  <h3 className="font-medium mb-3 flex items-center">
                    <MapPinIcon className="h-4 w-4 mr-2 text-accent" />
                    Current Location
                  </h3>
                  {selectedDriver.current_location ? (
                    <div>
                      <div className="h-[120px] rounded mb-2 overflow-hidden">
                        <MapboxMap 
                          drivers={[selectedDriver]}
                          height="120px"
                          zoom={14}
                          center={[selectedDriver.current_location.longitude, selectedDriver.current_location.latitude]}
                        />
                      </div>
                      <div className="text-sm">
                        <div>Lat: {selectedDriver.current_location.latitude.toFixed(6)}</div>
                        <div>Lng: {selectedDriver.current_location.longitude.toFixed(6)}</div>
                        <div className="text-text-secondary text-xs mt-1">
                          Last updated: {formatRelativeTime(selectedDriver.current_location.last_updated)}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-[120px] text-text-secondary">
                      No location data available
                    </div>
                  )}
                </div>
              </div>
              
              <div className="bg-background-light/30 p-4 rounded-lg mb-6">
                <h3 className="font-medium mb-3 flex items-center">
                  <Truck className="h-4 w-4 mr-2 text-accent" />
                  Assigned Orders ({driverOrders[selectedDriver.id]?.length || 0})
                </h3>
                {driverOrders[selectedDriver.id] && driverOrders[selectedDriver.id].length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-xs text-text-secondary border-b border-background-light">
                          <th className="pb-2 text-left">Order ID</th>
                          <th className="pb-2 text-left">Customer</th>
                          <th className="pb-2 text-left">Status</th>
                          <th className="pb-2 text-left">Address</th>
                          <th className="pb-2 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-background-light">
                        {driverOrders[selectedDriver.id].map((order) => (
                          <tr key={order.id} className="text-sm">
                            <td className="py-2">#{order.id}</td>
                            <td className="py-2">{order.customer?.snapchat_username || 'Unknown'}</td>
                            <td className="py-2">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                order.status === 'DELIVERED' ? 'bg-green-500/20 text-green-300' :
                                order.status === 'ENROUTE' ? 'bg-blue-500/20 text-blue-300' :
                                order.status === 'ASSIGNED' ? 'bg-yellow-500/20 text-yellow-300' :
                                'bg-gray-500/20 text-gray-300'
                              }`}>
                                {order.status}
                              </span>
                            </td>
                            <td className="py-2 max-w-[200px] truncate" title={order.address}>{order.address}</td>
                            <td className="py-2 text-right">${order.total_price.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-4 text-text-secondary">
                    No orders assigned to this driver
                  </div>
                )}
              </div>
              
              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowDriverDetails(false)}
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    setShowDriverDetails(false);
                    handleEditDriver(selectedDriver.id);
                  }}
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit Driver
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {loading ? (
          <div className="bg-background rounded-lg shadow-lg p-8 text-center">
            <RefreshCw className="h-8 w-8 mx-auto mb-4 animate-spin text-accent" />
            <p>Loading {activeTab}...</p>
          </div>
        ) : activeTab === 'drivers' ? (
          <div className="bg-background rounded-lg shadow-lg">
            <div className="mb-6">
              <DriverManager />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-background-light border-b border-background-light">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer" onClick={() => handleSort('full_name')}>
                      <div className="flex items-center">
                        Driver
                        <SortIcon field="full_name" />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer" onClick={() => handleSort('driver_status')}>
                      <div className="flex items-center">
                        Status
                        <SortIcon field="driver_status" />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer" onClick={() => handleSort('is_driver_active')}>
                      <div className="flex items-center">
                        Active
                        <SortIcon field="is_driver_active" />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer" onClick={() => handleSort('updated_at')}>
                      <div className="flex items-center">
                        Last Updated
                        <SortIcon field="updated_at" />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-background-light">
                  {filteredDrivers.length > 0 ? (
                    filteredDrivers.map((driver) => (
                      <tr key={driver.id} className="hover:bg-background-light/30 transition-colors">
                        <td className="px-4 py-3 text-sm">
                          <div className="font-medium">{driver.full_name || 'Unknown'}</div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${driverStatusInfo[driver.driver_status || 'active']?.color || 'bg-blue-500/20 text-blue-300'}`}>
                            {driverStatusInfo[driver.driver_status || 'active']?.icon}
                            {driver.driver_status ? formatStatus(driver.driver_status) : 'Active'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {driver.is_driver_active ? (
                            <span className="text-green-300">Yes</span>
                          ) : (
                            <span className="text-red-300">No</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {driver.updated_at ? (
                            <div>
                              <div>{formatDateTime(driver.updated_at).date}</div>
                              <div className="text-xs text-text-secondary">
                                {formatRelativeTime(driver.updated_at)}
                              </div>
                            </div>
                          ) : (
                            <span className="text-text-secondary">Never</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-right">
                          <Button 
                            variant="text" 
                            size="sm"
                            className="mr-2"
                            onClick={() => handleViewDriver(driver)}
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" /> View
                          </Button>
                          <Button 
                            variant="text" 
                            size="sm"
                            className="mr-2"
                            onClick={() => handleEditDriver(driver.id)}
                          >
                            <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit
                          </Button>
                          <Button 
                            variant="text" 
                            size="sm"
                            onClick={() => handleDeleteDriver(driver.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-text-secondary">
                        {searchTerm || filterStatus !== 'all' ? 
                          'No drivers found matching your criteria' : 
                          'No drivers found. Add a driver to get started.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-background rounded-lg shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-background-light border-b border-background-light">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer" onClick={() => handleSort('name')}>
                      <div className="flex items-center">
                        Route Name
                        <SortIcon field="name" />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer" onClick={() => handleSort('driver.full_name')}>
                      <div className="flex items-center">
                        Driver
                        <SortIcon field="driver.full_name" />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer" onClick={() => handleSort('status')}>
                      <div className="flex items-center">
                        Status
                        <SortIcon field="status" />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer" onClick={() => handleSort('order_count')}>
                      <div className="flex items-center">
                        Orders
                        <SortIcon field="order_count" />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer" onClick={() => handleSort('start_address')}>
                      <div className="flex items-center">
                        Start Location
                        <SortIcon field="start_address" />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer" onClick={() => handleSort('estimated_completion_time')}>
                      <div className="flex items-center">
                        Est. Completion
                        <SortIcon field="estimated_completion_time" />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-background-light">
                  {filteredRoutes.length > 0 ? (
                    filteredRoutes.map((route) => {
                      const { date, time } = formatDateTime(route.estimated_completion_time || '');
                      return (
                        <tr key={route.id} className="hover:bg-background-light/30 transition-colors">
                          <td className="px-4 py-3 text-sm font-medium">{route.name}</td>
                          <td className="px-4 py-3 text-sm">{route.driver?.full_name || 'Unassigned'}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${routeStatusInfo[route.status]?.color || ''}`}>
                              {routeStatusInfo[route.status]?.icon}
                              {formatStatus(route.status)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm font-medium">{route.order_count}</td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex items-center">
                              <MapPin className="h-3.5 w-3.5 text-accent mr-1" />
                              <span className="truncate max-w-[150px]" title={route.start_address}>
                                {route.start_address || 'Not set'}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {route.estimated_completion_time ? (
                              <div>
                                <div>{date}</div>
                                <div className="text-xs text-text-secondary">{time}</div>
                              </div>
                            ) : (
                              <span className="text-text-secondary">Not scheduled</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-right">
                            <Button 
                              variant="text" 
                              size="sm" 
                              className="mr-2"
                              onClick={() => {
                                // View route (implementation to be added)
                                alert('View route details: ' + route.id);
                              }}
                            >
                              View
                            </Button>
                            <Button 
                              variant="text" 
                              size="sm"
                              onClick={() => handleEditRoute(route.id)}
                            >
                              Edit
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-center text-text-secondary">
                        {searchTerm || filterStatus !== 'all' ? 
                          'No routes found matching your criteria' : 
                          'No routes found. Create a route to get started.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default RoutesAndDriversPage;