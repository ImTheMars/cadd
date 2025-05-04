import { supabase } from './supabase';
import { CustomerOrderSummary } from '../types/database.types';

/**
 * Fetch statistics for all customers (orders count and total spent)
 */
export const fetchAllCustomerStats = async (): Promise<Record<string, { totalOrders: number; totalSpent: number }>> => {
  try {
    // Use a direct SQL query to calculate order counts and totals for all customers
    const { data, error } = await supabase.rpc('get_all_customer_stats');

    // If the RPC function doesn't exist, fall back to a direct query
    if (error && error.code === 'PGRST116') {
      console.log("RPC function not available, using direct query");
      
      // Execute a direct SQL query to get customer stats
      const { data: queryData, error: queryError } = await supabase
        .from('orders')
        .select(`
          customer_id,
          total_price
        `)
        .not('customer_id', 'is', null);

      if (queryError) {
        throw queryError;
      }

      // Process the results
      const stats: Record<string, { totalOrders: number; totalSpent: number }> = {};
      
      if (queryData && queryData.length > 0) {
        queryData.forEach(order => {
          if (order.customer_id) {
            if (!stats[order.customer_id]) {
              stats[order.customer_id] = { totalOrders: 0, totalSpent: 0 };
            }
            stats[order.customer_id].totalOrders += 1;
            stats[order.customer_id].totalSpent += parseFloat(order.total_price || 0);
          }
        });
      }
      
      return stats;
    }

    if (error) {
      throw error;
    }

    // Convert the RPC results to the expected format
    const stats: Record<string, { totalOrders: number; totalSpent: number }> = {};
    
    if (data && Array.isArray(data)) {
      data.forEach(item => {
        if (item.customer_id) {
          stats[item.customer_id] = { 
            totalOrders: parseInt(item.order_count) || 0, 
            totalSpent: parseFloat(item.total_spent) || 0 
          };
        }
      });
    }
    
    return stats;
  } catch (err) {
    console.error('Error fetching customer stats:', err);
    // Return empty object rather than failing completely
    return {};
  }
};

/**
 * Fetch statistics for a specific customer
 */
export const fetchCustomerStats = async (customerId: string): Promise<CustomerOrderSummary> => {
  try {
    // Try to use the RPC function first
    const { data, error } = await supabase.rpc('get_customer_stats', { customer_id: customerId });
    
    // If the RPC function doesn't exist, fall back to a direct query
    if (error && error.code === 'PGRST116') {
      console.log("RPC function not available, using direct query");
      
      // Execute a direct query to get customer stats
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('id, total_price')
        .eq('customer_id', customerId);

      if (ordersError) {
        throw ordersError;
      }

      // Calculate the statistics
      const totalOrders = ordersData?.length || 0;
      const totalSpent = ordersData?.reduce((sum, order) => {
        const price = parseFloat(order.total_price || 0);
        return sum + (isNaN(price) ? 0 : price);
      }, 0) || 0;
      
      return {
        totalOrders,
        totalSpent,
        averageOrderValue: totalOrders > 0 ? totalSpent / totalOrders : 0
      };
    }

    if (error) {
      throw error;
    }

    // Process the RPC result
    if (data && typeof data === 'object') {
      return {
        totalOrders: parseInt(data.order_count) || 0,
        totalSpent: parseFloat(data.total_spent) || 0,
        averageOrderValue: data.order_count > 0 ? parseFloat(data.total_spent) / parseInt(data.order_count) : 0
      };
    }
    
    // Fallback to empty data
    return {
      totalOrders: 0,
      totalSpent: 0,
      averageOrderValue: 0
    };
  } catch (err) {
    console.error(`Error fetching stats for customer ${customerId}:`, err);
    return {
      totalOrders: 0,
      totalSpent: 0,
      averageOrderValue: 0
    };
  }
};