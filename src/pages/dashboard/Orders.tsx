import { useState, useEffect } from 'react';
import { Search, Filter, Package, Clock, Truck, CheckCircle, AlertTriangle, ArrowDown, ArrowUp, Tag, PackagePlus, X } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { supabase } from '../../lib/supabase';
import { formatDistanceToNow, format } from 'date-fns';

interface Order {
  id: number;
  customer_id: string;
  snapchat_username_at_order: string;
  status: 'PENDING' | 'ASSIGNED' | 'ENROUTE' | 'DELIVERED' | 'CANCELLED';
  total_price: number;
  address: string;
  created_at: string;
  updated_at: string;
  tags: string[];
  items_count?: number;
}

interface OrderTag {
  id: string;
  name: string;
  color: string;
}

const OrdersPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof Order>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filterStatus, setFilterStatus] = useState<Order['status'] | 'all'>('all');
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderTags, setOrderTags] = useState<Record<string, OrderTag>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const ordersPerPage = 500; // Using 500 orders per page as requested

  // Check if we have a newly created order
  useEffect(() => {
    if (location.state?.orderCreated) {
      setSuccessMessage(`Order #${location.state.orderId} has been created successfully!`);
      
      // Clear the success message after 5 seconds
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [location.state]);
  
  const fetchOrderTags = async () => {
    try {
      const { data, error } = await supabase
        .from('order_tags')
        .select('*');
      
      if (error) {
        throw error;
      }
      
      const tagsMap: Record<string, OrderTag> = {};
        data?.forEach(tag => {
          tagsMap[tag.id] = tag;
        });
        
        setOrderTags(tagsMap);
      } catch (err) {
        console.error('Error fetching order tags:', err);
      }
    };
    
    // Function to check user role
    const checkUserRole = async () => {
      try {
        const { data } = await supabase.rpc('get_my_role');
        console.log('Current user role:', data);
        return data;
      } catch (err) {
        console.error('Error checking user role:', err);
        return null;
      }
    };
    
    const fetchOrders = async (page = 1) => {
      try {
        setLoading(true);
        setError(null);
        console.log(`Fetching orders for page ${page}...`);
        
        // Check user role first
        const userRole = await checkUserRole();
        console.log('User role for orders access:', userRole);
        
        // If user doesn't have a role, use the service role client
        // This is a temporary solution - in production, you should enforce proper role-based access
        let queryClient = supabase;
        
        // First, get the total count of orders
        const { count: totalOrdersCount, error: countError } = await queryClient
          .from('orders')
          .select('*', { count: 'exact', head: true });
          
        if (countError) {
          console.error('Error getting order count:', countError);
        }
        
        if (totalOrdersCount !== null) {
          setTotalOrders(totalOrdersCount);
          setTotalPages(Math.ceil(totalOrdersCount / ordersPerPage));
        }
        
        // Calculate pagination indices
        const startIndex = (page - 1) * ordersPerPage;
        const endIndex = startIndex + ordersPerPage - 1;
        
        // Fetch orders for the current page
        const { data: pageOrders, error: ordersError } = await queryClient
          .from('orders')
          .select('id, customer_id, snapchat_username_at_order, status, total_price, address, created_at, updated_at, tags')
          .order('created_at', { ascending: false })
          .range(startIndex, endIndex);
        
        if (ordersError) {
          console.error('Error fetching orders:', ordersError);
          throw ordersError;
        }
        
        if (!pageOrders || pageOrders.length === 0) {
          console.log('No orders found for this page');
          setOrders([]);
          setLoading(false);
          return;
        }
        
        console.log(`Received ${pageOrders.length} orders for page ${page}`);
        
        // Get order items count using a more efficient approach
        // The previous approach was causing 400 errors due to URL length limits
        let orderItemsCountMap: Record<number, number> = {};
        
        try {
          // Try to use the RPC function to get counts directly
          try {
            const { data: itemCounts, error: countError } = await queryClient.rpc(
              'get_order_items_count',
              { order_ids: pageOrders.map((order: any) => order.id) }
            );
            
            if (!countError && itemCounts && itemCounts.length > 0) {
              // Format: [{order_id: 123, count: 5}, ...]
              itemCounts.forEach((item: {order_id: number, count: number}) => {
                orderItemsCountMap[item.order_id] = item.count;
              });
              console.log('Successfully fetched order item counts via RPC');
            } else {
              // If we reach here, there was an error or no data from RPC
              if (countError) {
                console.error('Error fetching order item counts via RPC:', countError);
              } else {
                console.log('No data returned from RPC function, falling back to batch method');
              }
              
              // Fallback: Process orders in smaller batches to avoid URL length limits
              console.log('Using batch method to fetch order items');
              const batchSize = 50;
              for (let i = 0; i < pageOrders.length; i += batchSize) {
                const batchOrderIds = pageOrders.slice(i, i + batchSize).map((order: any) => order.id);
                
                const { data: batchItems, error: batchError } = await queryClient
                  .from('order_items')
                  .select('order_id, id')
                  .in('order_id', batchOrderIds);
                  
                if (batchError) {
                  console.error(`Error fetching batch ${i}-${i+batchSize} order items:`, batchError);
                  continue;
                }
                
                if (batchItems) {
                  batchItems.forEach((item: { order_id: number }) => {
                    if (orderItemsCountMap[item.order_id]) {
                      orderItemsCountMap[item.order_id]++;
                    } else {
                      orderItemsCountMap[item.order_id] = 1;
                    }
                  });
                }
              }
            }
          } catch (rpcError) {
            console.error('Exception when calling RPC function:', rpcError);
            
            // Fallback if RPC call throws an exception
            console.log('Using batch method after RPC exception');
            const batchSize = 50;
            for (let i = 0; i < pageOrders.length; i += batchSize) {
              const batchOrderIds = pageOrders.slice(i, i + batchSize).map((order: any) => order.id);
              
              const { data: batchItems, error: batchError } = await queryClient
                .from('order_items')
                .select('order_id, id')
                .in('order_id', batchOrderIds);
                
              if (batchError) {
                console.error(`Error fetching batch ${i}-${i+batchSize} order items:`, batchError);
                continue;
              }
              
              if (batchItems) {
                batchItems.forEach((item: { order_id: number }) => {
                  if (orderItemsCountMap[item.order_id]) {
                    orderItemsCountMap[item.order_id]++;
                  } else {
                    orderItemsCountMap[item.order_id] = 1;
                  }
                });
              }
            }
          }
        } catch (error) {
          console.error('Error processing order items:', error);
        }
        
        // Add item counts to orders
        const ordersWithItemsCount = pageOrders.map((order: any) => ({
          ...order,
          items_count: orderItemsCountMap[order.id] || 0
        }));
        
        console.log('Orders processed successfully');
        setOrders(ordersWithItemsCount);
      } catch (err) {
        console.error('Error fetching orders:', err);
        setError('Failed to load orders. Please try again.');
      } finally {
        setLoading(false);
      }
    };
  
  // Load orders when the page changes
  useEffect(() => {
    const loadData = async () => {
      await fetchOrderTags();
      await fetchOrders(currentPage);
    };
    
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);
  
  const statusColors = {
    PENDING: 'bg-yellow-500/20 text-yellow-300',
    ASSIGNED: 'bg-blue-500/20 text-blue-300',
    ENROUTE: 'bg-purple-500/20 text-purple-300',
    DELIVERED: 'bg-green-500/20 text-green-300',
    CANCELLED: 'bg-red-500/20 text-red-300'
  };
  
  const statusIcons = {
    PENDING: <Clock className="h-3.5 w-3.5 mr-1" />,
    ASSIGNED: <Package className="h-3.5 w-3.5 mr-1" />,
    ENROUTE: <Truck className="h-3.5 w-3.5 mr-1" />,
    DELIVERED: <CheckCircle className="h-3.5 w-3.5 mr-1" />,
    CANCELLED: <AlertTriangle className="h-3.5 w-3.5 mr-1" />
  };
  
  const handleSort = (field: keyof Order) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  // Filter and sort orders
  const filteredOrders = orders
    .filter(order => 
      (filterStatus === 'all' || order.status === filterStatus) && 
      (order.id.toString().includes(searchTerm.toLowerCase()) || 
        order.snapchat_username_at_order?.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => {
      if (sortField === 'total_price' || sortField === 'items_count' || sortField === 'id') {
        const valA = a[sortField] || 0;
        const valB = b[sortField] || 0;
        return sortDirection === 'asc' ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
      }
      
      const valA = a[sortField] || '';
      const valB = b[sortField] || '';
      
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };
  
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch (e) {
      return 'Invalid date';
    }
  };
  
  const formatRelativeTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch (e) {
      return 'Unknown';
    }
  };
  
  const SortIcon = ({ field }: { field: keyof Order }) => {
    if (field !== sortField) return <ArrowDown className="h-3 w-3 opacity-30" />;
    return sortDirection === 'asc' ? 
      <ArrowUp className="h-3 w-3 text-accent" /> : 
      <ArrowDown className="h-3 w-3 text-accent" />;
  };
  
  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold flex items-center">
            <Package className="h-6 w-6 mr-2 text-accent" />
            Orders
          </h1>
          <Button className="flex items-center" onClick={() => navigate('/dashboard/orders/new')}>
            <PackagePlus className="h-4 w-4 mr-2" />
            New Order
          </Button>
        </div>
        
        {successMessage && (
          <div className="bg-green-900/20 border border-green-500 text-green-300 p-4 rounded-lg mb-6 flex items-center justify-between">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 mr-2" />
              {successMessage}
            </div>
            <button onClick={() => setSuccessMessage(null)} className="text-green-300 hover:text-green-100">
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        
        <div className="bg-background/70 backdrop-blur-lg rounded-lg shadow-lg mb-6 p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-secondary" />
              <Input
                type="text"
                placeholder="Search orders or customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
            <div className="relative">
              <select
                className="bg-background-light border-2 border-background-light px-3 py-2 rounded-md text-text-primary appearance-none pr-9 focus:outline-none focus:border-accent"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as Order['status'] | 'all')}
              >
                <option value="all">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="ENROUTE">En Route</option>
                <option value="DELIVERED">Delivered</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
              <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-secondary" />
            </div>
          </div>
        </div>
        
        {error && (
          <div className="bg-red-900/20 border border-red-500 text-red-300 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}
        
        <div className="bg-background rounded-lg shadow-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-accent border-r-2 border-b-transparent"></div>
              <p className="mt-2 text-text-secondary">Loading orders...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-background-light border-b border-background-light">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer" onClick={() => handleSort('id')}>
                      <div className="flex items-center">
                        Order ID
                        <SortIcon field="id" />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer" onClick={() => handleSort('snapchat_username_at_order')}>
                      <div className="flex items-center">
                        Customer
                        <SortIcon field="snapchat_username_at_order" />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer" onClick={() => handleSort('created_at')}>
                      <div className="flex items-center">
                        Date
                        <SortIcon field="created_at" />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer" onClick={() => handleSort('total_price')}>
                      <div className="flex items-center">
                        Total
                        <SortIcon field="total_price" />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer" onClick={() => handleSort('items_count')}>
                      <div className="flex items-center">
                        Items
                        <SortIcon field="items_count" />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer" onClick={() => handleSort('status')}>
                      <div className="flex items-center">
                        Status
                        <SortIcon field="status" />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                      <div className="flex items-center">
                        Tags
                        <Tag className="h-3 w-3 ml-1 opacity-30" />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                      <div className="flex items-center">
                        Location
                      </div>
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-background-light">
                  {filteredOrders.length > 0 ? (
                    filteredOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-background-light/30 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium">#{order.id}</td>
                        <td className="px-4 py-3 text-sm">{order.snapchat_username_at_order}</td>
                        <td className="px-4 py-3 text-sm">
                          <div>{formatDate(order.created_at)}</div>
                          <div className="text-xs text-text-secondary">{formatRelativeTime(order.created_at)}</div>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-accent">{formatCurrency(order.total_price)}</td>
                        <td className="px-4 py-3 text-sm">{order.items_count}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusColors[order.status]}`}>
                            {statusIcons[order.status]}
                            {order.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex flex-wrap gap-1">
                            {order.tags && order.tags.length > 0 ? (
                              order.tags.map((tagId) => {
                                const tag = orderTags[tagId];
                                if (!tag) return null;
                                return (
                                  <span 
                                    key={tagId} 
                                    className="px-2 py-0.5 rounded-full text-xs inline-flex items-center"
                                    style={{ 
                                      backgroundColor: `${tag.color}20`, 
                                      color: tag.color 
                                    }}
                                  >
                                    <Tag className="h-3 w-3 mr-1" />
                                    {tag.name}
                                  </span>
                                );
                              })
                            ) : (
                              <span className="text-text-secondary text-xs">No tags</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="text-xs max-w-[150px] truncate" title={order.address}>
                            {order.address}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-right">
                          <Button 
                            variant="text" 
                            size="sm" 
                            className="mr-2"
                            onClick={() => navigate(`/dashboard/orders/${order.id}`)}
                          >
                            View
                          </Button>
                          <Button 
                            variant="text" 
                            size="sm"
                            onClick={() => navigate(`/dashboard/orders/${order.id}/edit`)}
                          >
                            Edit
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="px-4 py-6 text-center text-text-secondary">
                        {searchTerm || filterStatus !== 'all' ? 'No orders found matching your criteria' : 'No orders found'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          <div className="bg-background-light px-4 py-3 flex items-center justify-between border-t border-background-light">
            <div className="flex-1 flex justify-between items-center">
              <div>
                <p className="text-sm text-text-secondary">
                  Showing <span className="font-medium">{filteredOrders.length}</span> orders from page {currentPage} of {totalPages} (Total: {totalOrders} orders)
                </p>
              </div>
              
              {/* Pagination Controls */}
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1 || loading}
                >
                  Previous
                </Button>
                
                <span className="text-sm px-2">
                  Page {currentPage} of {totalPages}
                </span>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages || loading}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default OrdersPage;