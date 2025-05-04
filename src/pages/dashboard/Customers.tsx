import { useState, useEffect } from 'react';
import { Search, Users, Ghost, ArrowDown, ArrowUp, ShoppingBag, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { supabase } from '../../lib/supabase';
import { fetchAllCustomerStats } from '../../lib/api';

interface Customer {
  id: string;
  snapchat_username: string;
  phone_number: string;
  email: string;
  notes: string;
  telegram_username: string;
  created_at: string;
  updated_at: string;
}

const CustomersPage = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<string>('snapchat_username');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerStats, setCustomerStats] = useState<Record<string, { totalOrders: number; totalSpent: number }>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const pageSize = 250; // 250 customers per page

  // Fetch customers with pagination
  const fetchCustomers = async (page = 1) => {
    try {
      setLoading(true);
      
      // First get the total count for pagination
      const { count, error: countError } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true });
      
      if (countError) {
        throw countError;
      }
      
      setTotalCustomers(count || 0);
      
      // Then fetch the current page of customers
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .range((page - 1) * pageSize, page * pageSize - 1)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setCustomers(data || []);
      
      // Get customer stats from API or edge function
      const stats = await fetchAllCustomerStats();
      setCustomerStats(stats);
    } catch (err) {
      console.error('Error fetching customers:', err);
      setError('Failed to load customers. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Change page
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    fetchCustomers(newPage);
  };

  useEffect(() => {
    fetchCustomers(currentPage);
  }, [currentPage]);
  
  const handleSort = (field: string) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  // Filter and sort customers
  const filteredCustomers = customers
    .filter(customer => 
      customer.snapchat_username?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      customer.phone_number?.includes(searchTerm)
    )
    .sort((a, b) => {
      if (sortField === 'totalOrders') {
        const ordersA = customerStats[a.id]?.totalOrders || 0;
        const ordersB = customerStats[b.id]?.totalOrders || 0;
        return sortDirection === 'asc' ? ordersA - ordersB : ordersB - ordersA;
      }
      
      if (sortField === 'totalSpent') {
        const spentA = customerStats[a.id]?.totalSpent || 0;
        const spentB = customerStats[b.id]?.totalSpent || 0;
        return sortDirection === 'asc' ? spentA - spentB : spentB - spentA;
      }
      
      const valA = a[sortField as keyof Customer] || '';
      const valB = b[sortField as keyof Customer] || '';
      
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
  
  const SortIcon = ({ field }: { field: string }) => {
    if (field !== sortField) return <ArrowDown className="h-3 w-3 opacity-30" />;
    return sortDirection === 'asc' ? 
      <ArrowUp className="h-3 w-3 text-accent" /> : 
      <ArrowDown className="h-3 w-3 text-accent" />;
  };

  const handleViewCustomer = (id: string) => {
    navigate(`/dashboard/customers/${id}`);
  };
  
  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold flex items-center">
            <Users className="h-6 w-6 mr-2 text-accent" />
            Customers
          </h1>
        </div>
        
        <div className="bg-background/70 backdrop-blur-lg rounded-lg shadow-lg mb-6 p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-secondary" />
              <Input
                type="text"
                placeholder="Search by name or Snapchat username..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full"
              />
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
              <p className="mt-2 text-text-secondary">Loading customers...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-background-light border-b border-background-light">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer" onClick={() => handleSort('snapchat_username')}>
                      <div className="flex items-center">
                        Name
                        <SortIcon field="snapchat_username" />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer" onClick={() => handleSort('snapchat_username')}>
                      <div className="flex items-center">
                        Snapchat
                        <SortIcon field="snapchat_username" />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer" onClick={() => handleSort('totalOrders')}>
                      <div className="flex items-center">
                        Orders
                        <SortIcon field="totalOrders" />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer" onClick={() => handleSort('totalSpent')}>
                      <div className="flex items-center">
                        Total Spent
                        <SortIcon field="totalSpent" />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-background-light">
                  {filteredCustomers.length > 0 ? (
                    filteredCustomers.map((customer) => (
                      <tr key={customer.id} className="hover:bg-background-light/30 transition-colors">
                        <td className="px-4 py-3 text-sm">
                          <div className="font-medium">{customer.snapchat_username || 'N/A'}</div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center text-xs text-text-secondary">
                            <Ghost className="h-3 w-3 mr-1" /> {customer.snapchat_username || 'N/A'}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center">
                            <ShoppingBag className="h-3.5 w-3.5 text-accent mr-1" />
                            {customerStats[customer.id]?.totalOrders || 0}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-accent">
                          <div className="flex items-center">
                            <CreditCard className="h-3.5 w-3.5 mr-1" />
                            {formatCurrency(customerStats[customer.id]?.totalSpent || 0)}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-right">
                          <Button 
                            variant="text" 
                            size="sm"
                            onClick={() => handleViewCustomer(customer.id)}
                          >
                            View
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-text-secondary">
                        {searchTerm ? 'No customers found matching your search' : 'No customers found'}
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
                  Showing <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> to <span className="font-medium">{Math.min(currentPage * pageSize, totalCustomers)}</span> of <span className="font-medium">{totalCustomers}</span> customers
                </p>
              </div>
              
              {/* Pagination Controls */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`px-3 py-1 rounded text-sm ${currentPage === 1 ? 'bg-background-light text-text-secondary cursor-not-allowed' : 'bg-background hover:bg-background-light text-text-primary'}`}
                >
                  Previous
                </button>
                
                <div className="text-sm text-text-secondary">
                  Page {currentPage} of {Math.ceil(totalCustomers / pageSize)}
                </div>
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= Math.ceil(totalCustomers / pageSize)}
                  className={`px-3 py-1 rounded text-sm ${currentPage >= Math.ceil(totalCustomers / pageSize) ? 'bg-background-light text-text-secondary cursor-not-allowed' : 'bg-background hover:bg-background-light text-text-primary'}`}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CustomersPage;