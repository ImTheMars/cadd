/**
 * Represents a driver's location data
 */
export interface DriverLocation {
  latitude: number;
  longitude: number;
  last_updated: string;
}

/**
 * Represents vehicle details for a driver
 */
export interface VehicleDetails {
  make?: string;
  model?: string;
  year?: number;
  color?: string;
  license_plate?: string;
  type?: 'car' | 'motorcycle' | 'bicycle' | 'other';
}

/**
 * Represents a driver profile as stored in Supabase
 */
export interface DriverProfile {
  id: string;
  clerk_user_id: string;
  driver_status: 'active' | 'on-delivery' | 'off-duty' | 'on-break';
  current_location?: DriverLocation | null;
  vehicle_details?: VehicleDetails | null;
  license_number?: string;
  driver_image_url?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Represents a combined driver object with data from both Clerk and Supabase
 */
export interface Driver {
  id: string;
  name: string;
  email: string;
  phone: string;
  profile_image_url: string;
  driver_status: 'active' | 'on-delivery' | 'off-duty' | 'on-break';
  current_location?: DriverLocation | null;
  vehicle_details?: VehicleDetails | null;
  license_number?: string;
  created_at?: string;
  updated_at?: string;
  
  // Clerk-specific field to link to Clerk user
  clerk_user_id: string;
  
  // Additional fields for compatibility with existing code
  full_name: string;           // Will map to 'name' in our implementation
  is_driver_active: boolean;   // Will be derived from driver_status
  role: 'driver' | 'default' | 'manager' | 'owner';  // Will always be 'driver' for driver objects
}
