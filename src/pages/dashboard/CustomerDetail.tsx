import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingBag } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import Button from '../../components/ui/Button';
import CustomerPersonalInfo from '../../components/CustomerPersonalInfo';
import CustomerOrderHistory from '../../components/CustomerOrderHistory';
import CustomerOrdersSummary from '../../components/CustomerOrdersSummary';
import CustomerNotesSection from '../../components/CustomerNotesSection';
import { supabase } from '../../lib/supabase';
import { fetchCustomerStats } from '../../lib/api';
import { Customer, Order, OrderItem, Product, CustomerNote, CustomerOrderSummary } from '../../types/database.types';



const CustomerDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [notes, setNotes] = useState<CustomerNote[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderItems, setOrderItems] = useState<Record<number, { item: OrderItem; product: Product }[]>>({});
  const [summary, setSummary] = useState<CustomerOrderSummary>({
    totalOrders: 0,
    totalSpent: 0,
    averageOrderValue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCustomerData = async () => {
      if (!id) return;

      try {
        setLoading(true);
        
        // Fetch customer
        const { data: customerData, error: customerError } = await supabase
          .from('customers')
          .select('*')
          .eq('id', id)
          .single();

        if (customerError) throw customerError;
        setCustomer(customerData);

        // Fetch customer notes
        const { data: notesData, error: notesError } = await supabase
          .from('customer_notes')
          .select('*')
          .eq('customer_id', id)
          .order('created_at', { ascending: false });

        if (!notesError) {
          setNotes(notesData || []);
        }

        // Fetch orders
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select('*')
          .eq('customer_id', id)
          .order('created_at', { ascending: false });

        if (ordersError) throw ordersError;
        setOrders(ordersData || []);

        // Get customer stats directly from orders data
        // This ensures consistency with the Customers.tsx approach and real-time data
        const totalOrders = ordersData?.length || 0;
        const totalSpent = ordersData?.reduce((sum, order) => {
          // Make sure we handle various formats of total_price correctly
          const price = typeof order.total_price === 'string' 
            ? parseFloat(order.total_price) 
            : (typeof order.total_price === 'number' ? order.total_price : 0);
          return sum + (isNaN(price) ? 0 : price);
        }, 0) || 0;
        
        const customerStats = {
          totalOrders,
          totalSpent,
          averageOrderValue: totalOrders > 0 ? totalSpent / totalOrders : 0
        };
        
        setSummary(customerStats);

        // Fetch order items for each order
        const orderItemsMap: Record<number, { item: OrderItem; product: Product }[]> = {};
        
        if (ordersData && ordersData.length > 0) {
          for (const order of ordersData) {
            const { data: itemsData, error: itemsError } = await supabase
              .from('order_items')
              .select('*')
              .eq('order_id', order.id);

            if (itemsError) continue;

            orderItemsMap[order.id] = [];
            
            if (itemsData && itemsData.length > 0) {
              for (const item of itemsData) {
                const { data: productData, error: productError } = await supabase
                  .from('products')
                  .select('*')
                  .eq('id', item.product_id)
                  .single();

                if (!productError && productData) {
                  orderItemsMap[order.id].push({
                    item,
                    product: productData,
                  });
                }
              }
            }
          }
        }
        
        setOrderItems(orderItemsMap);
      } catch (err) {
        console.error('Error fetching customer data:', err);
        setError('Failed to load customer data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchCustomerData();
  }, [id]);

  const handleCustomerUpdated = (updatedCustomer: Customer) => {
    setCustomer(updatedCustomer);
  };

  const handleNoteAdded = (note: CustomerNote) => {
    setNotes([note, ...notes]);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6 max-w-7xl mx-auto text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-accent border-r-2 border-b-transparent"></div>
          <p className="mt-2 text-text-secondary">Loading customer data...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !customer) {
    return (
      <DashboardLayout>
        <div className="p-6 max-w-7xl mx-auto">
          <div className="bg-red-900/20 border border-red-500 text-red-300 p-6 rounded-lg mb-6 text-center">
            <p className="mb-4">{error || 'Customer not found'}</p>
            <Button variant="outline" onClick={() => navigate('/dashboard/customers')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Customers
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <button
              className="flex items-center text-text-secondary mb-2 hover:text-accent"
              onClick={() => navigate('/dashboard/customers')}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to customers
            </button>
            <h1 className="text-2xl font-bold">
              {customer.snapchat_username || 'Unnamed Customer'}
            </h1>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center"
              onClick={() => navigate(`/dashboard/new-order?customer=${customer.id}`)}
            >
              <ShoppingBag className="h-4 w-4 mr-1" />
              New Order
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column: Personal info + Financial summary */}
          <div className="space-y-6 lg:col-span-2">
            <CustomerPersonalInfo 
              customer={customer} 
              onCustomerUpdated={handleCustomerUpdated} 
            />
            <CustomerOrdersSummary summary={summary} />
            <CustomerOrderHistory 
              orders={orders} 
              orderItems={orderItems} 
            />
          </div>
          
          {/* Right column: Notes */}
          <div className="space-y-6">
            <CustomerNotesSection 
              customerId={customer.id} 
              notes={notes}
              onNoteAdded={handleNoteAdded}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CustomerDetail;