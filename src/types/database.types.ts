export interface Customer {
  id: string;
  snapchat_username: string;
  phone_number: string;
  email: string;
  notes: string;
  telegram_username: string;
  created_at: string;
  updated_at: string;
  instagram_username?: string;
}

export interface Order {
  id: number;
  customer_id: string;
  driver_id: string;
  snapchat_username_at_order: string;
  address: string;
  total_price: number;
  total_paid: number;
  status: 'PENDING' | 'ASSIGNED' | 'ENROUTE' | 'DELIVERED' | 'CANCELLED';
  payment_status: 'PENDING' | 'PARTIAL' | 'PAID' | 'REFUNDED';
  notes: string;
  created_at: string;
  updated_at: string;
  tags: string[];
}

export interface OrderItem {
  id: string;
  order_id: number;
  product_id: string;
  quantity: number;
  price_at_time: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  current_stock: number;
  image_url: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  brand?: string;
  product_line?: string;
  variant_name?: string;
  substance?: string;
  strain_type?: string;
  size_details?: string;
  product_tags?: string[];
  embedding?: any;
  is_in_stock?: boolean;
  warehouse_location?: string;
}

export interface OrderTag {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface CustomerNote {
  id: string;
  customer_id: string;
  content: string;
  author: string;
  created_at: string;
}

export interface CustomerOrderSummary {
  totalOrders: number;
  totalSpent: number;
  averageOrderValue: number;
}

export interface Profile {
  id: string;
  role: 'default' | 'driver' | 'manager' | 'owner';
  full_name: string;
  is_driver_active?: boolean;
  driver_status?: 'active' | 'on-delivery' | 'off-duty' | 'on-break';
  current_location?: {
    latitude: number;
    longitude: number;
    last_updated: string;
  };
  home_address?: string;
  home_coordinates?: {
    latitude: number;
    longitude: number;
  };
  phone?: string;
  email?: string;
  created_at: string;
  updated_at: string;
}

export interface Route {
  id: string;
  name: string;
  driver_id: string;
  status: 'scheduled' | 'in-progress' | 'completed' | 'delayed';
  start_location: any;
  start_address: string;
  estimated_completion_time: string;
  actual_start_time: string | null;
  actual_completion_time: string | null;
  total_distance: number;
  notes: string;
  created_at: string;
  updated_at: string;
  driver?: Profile;
  route_orders?: RouteOrder[];
}

export interface RouteOrder {
  id: string;
  route_id: string;
  order_id: number;
  stop_number: number;
  status: 'pending' | 'completed' | 'skipped';
  estimated_arrival_time: string;
  actual_arrival_time: string | null;
  created_at: string;
  updated_at: string;
  order?: Order;
}