import React, { useEffect, useState } from 'react';
import { Package, ShoppingBag, Truck, AlertTriangle, PackagePlus, AlertCircle, CheckCircle } from 'lucide-react';
import Button from './ui/Button';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';


interface DashboardStats {
  pendingOrders: number;
  assignedOrders: number;
  routesInProgress: number;
  scheduledRoutes: number;
  activeDrivers: number;
  lowStockItems: number;
}

interface DashboardSummaryProps {}

const DashboardSummary: React.FC<DashboardSummaryProps> = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    pendingOrders: 0,
    assignedOrders: 0,
    routesInProgress: 0,
    scheduledRoutes: 0,
    activeDrivers: 0,
    lowStockItems: 0
  });
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      // Fetch pending orders count
      const { count: pendingOrders, error: pendingError } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'PENDING');

      // Fetch assigned orders count
      const { count: assignedOrders, error: assignedError } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'ASSIGNED');
      
      // Fetch routes in progress
      const { count: routesInProgress, error: routesInProgressError } = await supabase
        .from('routes')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'in-progress');
      
      // Fetch scheduled routes
      const { count: scheduledRoutes, error: scheduledRoutesError } = await supabase
        .from('routes')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'scheduled');
      
      // Fetch active drivers count
      const { count: activeDrivers, error: driversError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'driver')
        .eq('is_driver_active', true);
      
      // Fetch low stock items count
      const { data: lowStockItems, error: stockError } = await supabase
        .from('products')
        .select('id')
        .lte('current_stock', 5)
        .gt('current_stock', 0);
      
      if (!pendingError && !assignedError && !routesInProgressError && 
          !scheduledRoutesError && !driversError && !stockError) {
        setStats({
          pendingOrders: pendingOrders || 0,
          assignedOrders: assignedOrders || 0,
          routesInProgress: routesInProgress || 0,
          scheduledRoutes: scheduledRoutes || 0,
          activeDrivers: activeDrivers || 0,
          lowStockItems: lowStockItems?.length || 0
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Format the current datetime in a nicer way
  const formatDateTime = () => {
    const now = new Date();
    return now.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    }) + ', ' + now.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getStatusColor = (count: number, threshold: number) => {
    if (loading) return "bg-gray-500/20 text-gray-300";
    return count > threshold 
      ? "bg-yellow-500/20 text-yellow-300" 
      : count > 0 
        ? "bg-green-500/20 text-green-300" 
        : "bg-background/30";
  };

  return (
    <div className="w-[280px] bg-background/95 backdrop-blur-lg p-4 rounded-lg shadow-lg z-10 border border-accent/10">
      <div className="flex items-center mb-4">
        <span className="bg-accent/10 p-1.5 rounded-md mr-2">
          <ShoppingBag className="h-5 w-5 text-accent" />
        </span>
        <h2 className="text-lg font-bold text-text-primary">Dashboard Overview</h2>
      </div>
      
      {/* Order Statistics */}
      <div className="space-y-3 mb-4">
        <div className="bg-background-light/80 p-3 rounded-md">
          <h3 className="text-sm font-medium mb-2 flex items-center">
            <Package className="h-4 w-4 mr-1.5 text-accent" />
            Orders
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <div className={`p-2 rounded ${getStatusColor(stats.pendingOrders, 5)}`}>
              <div className="text-xs font-medium mb-1">Pending</div>
              <div className="text-xl font-bold">{loading ? "..." : stats.pendingOrders}</div>
            </div>
            <div className={`p-2 rounded ${getStatusColor(stats.assignedOrders, 5)}`}>
              <div className="text-xs font-medium mb-1">Assigned</div>
              <div className="text-xl font-bold">{loading ? "..." : stats.assignedOrders}</div>
            </div>
          </div>
        </div>
        
        <div className="bg-background-light/80 p-3 rounded-md">
          <h3 className="text-sm font-medium mb-2 flex items-center">
            <Truck className="h-4 w-4 mr-1.5 text-accent" />
            Routes & Drivers
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <div className={`p-2 rounded ${getStatusColor(stats.routesInProgress, 3)}`}>
              <div className="text-xs font-medium mb-1">In Progress</div>
              <div className="text-xl font-bold">{loading ? "..." : stats.routesInProgress}</div>
            </div>
            <div className="p-2 rounded bg-background/30">
              <div className="text-xs font-medium mb-1">Active Drivers</div>
              <div className="text-xl font-bold">{loading ? "..." : stats.activeDrivers}</div>
            </div>
          </div>
        </div>

        <div className="bg-background-light/80 p-3 rounded-md">
          <h3 className="text-sm font-medium mb-2 flex items-center">
            <AlertCircle className="h-4 w-4 mr-1.5 text-accent" />
            Alerts
          </h3>
          <div className="space-y-2">
            {(loading || stats.lowStockItems > 0) && (
              <div className="flex items-center text-yellow-300 p-1.5 rounded bg-yellow-900/20 text-xs">
                <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
                <span>{loading ? "Checking inventory..." : `${stats.lowStockItems} items low on stock`}</span>
              </div>
            )}

            {!loading && (stats.pendingOrders === 0) && (
              <div className="flex items-center text-green-300 p-1.5 rounded bg-green-900/20 text-xs">
                <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                <span>No pending orders</span>
              </div>
            )}

            {!loading && (stats.pendingOrders > 5) && (
              <div className="flex items-center text-orange-300 p-1.5 rounded bg-orange-900/20 text-xs">
                <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
                <span>High number of pending orders</span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Quick Actions */}
      <div className="space-y-2 mb-4">
        <h3 className="text-sm font-medium mb-1">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center justify-center py-2 text-xs hover:bg-accent/10 border-accent/30 hover:border-accent"
            onClick={() => navigate('/dashboard/orders/new')}
          >
            <PackagePlus className="h-3.5 w-3.5 mr-1.5 text-accent" />
            New Order
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center justify-center py-2 text-xs hover:bg-accent/10 border-accent/30 hover:border-accent"
            onClick={() => navigate('/dashboard/routes-drivers')}
          >
            <Truck className="h-3.5 w-3.5 mr-1.5 text-accent" />
            Routes
          </Button>
        </div>
      </div>
      

      
      {/* Last updated info */}
      <div className="text-xs text-text-secondary flex justify-between items-center pt-2 border-t border-background-light">
        <span>Last updated:</span>
        <span>{formatDateTime()}</span>
      </div>
    </div>
  );
};

export default DashboardSummary;