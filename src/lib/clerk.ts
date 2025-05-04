import { Driver, DriverProfile } from '../types/driver.types';

// Define interfaces for Clerk user types
export interface ClerkUser {
  id: string;
  firstName?: string;
  lastName?: string;
  emailAddresses?: { emailAddress: string }[];
  phoneNumbers?: { phoneNumber: string }[];
  imageUrl?: string;
  publicMetadata?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

// Mock data for development
const MOCK_DRIVERS = [
  {
    id: 'driver_1',
    firstName: 'John',
    lastName: 'Driver',
    emailAddresses: [{ emailAddress: 'john.driver@example.com' }],
    publicMetadata: { role: 'driver' },
    imageUrl: 'https://randomuser.me/api/portraits/men/1.jpg',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'driver_2',
    firstName: 'Jane',
    lastName: 'Route',
    emailAddresses: [{ emailAddress: 'jane.route@example.com' }],
    publicMetadata: { role: 'driver' },
    imageUrl: 'https://randomuser.me/api/portraits/women/1.jpg',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

const MOCK_ADMIN = {
  id: 'admin_1',
  firstName: 'Admin',
  lastName: 'User',
  emailAddresses: [{ emailAddress: 'admin@example.com' }],
  publicMetadata: { role: 'admin' },
  imageUrl: 'https://randomuser.me/api/portraits/men/10.jpg',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// Initialize the mock Clerk instance for development
let mockClerkInstance: any = null;

/**
 * Get a Clerk instance (or mock in development)
 */
export async function getClerkInstance(): Promise<any> {
  // In production, this would try to load the real Clerk SDK
  // In our case, we'll use the mock data until the Edge Function is set up
  
  if (mockClerkInstance) {
    return mockClerkInstance;
  }
  
  // Create a mock instance with the admin user
  mockClerkInstance = {
    loaded: true,
    user: MOCK_ADMIN,
    session: {
      id: 'mock_session',
      userId: MOCK_ADMIN.id
    }
  };
  
  return mockClerkInstance;
}

/**
 * Gets all Clerk users with a specific role
 * @param role The role to filter users by (e.g. 'driver')
 * @returns Array of users with the specified role
 */
export async function getUsersByRole(role: string): Promise<ClerkUser[]> {
  try {
    // For development without the Clerk backend API, return mock data
    if (role === 'driver') {
      return MOCK_DRIVERS;
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching users by role:', error);
    return [];
  }
}

/**
 * Gets the current authenticated user from Clerk
 * @returns The current user or null if not authenticated
 */
export async function getCurrentClerkUser(): Promise<ClerkUser | null> {
  try {
    const clerk = await getClerkInstance();
    if (!clerk || !clerk.user) return null;
    
    return clerk.user;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Checks if the current user has a specific role
 * @param role The role to check for
 * @returns Boolean indicating if user has the role
 */
export async function currentUserHasRole(role: string): Promise<boolean> {
  try {
    const user = await getCurrentClerkUser();
    if (!user) return false;
    
    // For simplicity in development, any username with 'admin' is an admin
    // This matches the behavior mentioned in the memory
    if (role === 'admin') {
      const email = user.emailAddresses?.[0]?.emailAddress || '';
      if (email.includes('admin')) {
        return true;
      }
    }
    
    return user.publicMetadata?.role === role;
  } catch (error) {
    console.error('Error checking user role:', error);
    return false;
  }
}

/**
 * Maps a Clerk user to a standardized driver format
 * @param clerkUser Clerk user object
 * @param driverDetails Additional driver details from Supabase
 * @returns Formatted driver object
 */
export function mapClerkUserToDriver(clerkUser: ClerkUser, driverDetails: Partial<DriverProfile> = {}): Driver {
  const name = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'Unknown';
  
  return {
    id: clerkUser.id,
    clerk_user_id: clerkUser.id,
    name: name,
    email: clerkUser.emailAddresses?.[0]?.emailAddress || '',
    phone: clerkUser.phoneNumbers?.[0]?.phoneNumber || '',
    profile_image_url: clerkUser.imageUrl || driverDetails.driver_image_url || '',
    driver_status: driverDetails.driver_status || 'active',
    current_location: driverDetails.current_location || null,
    vehicle_details: driverDetails.vehicle_details || null,
    license_number: driverDetails.license_number || '',
    created_at: driverDetails.created_at || clerkUser.createdAt,
    updated_at: driverDetails.updated_at || clerkUser.updatedAt,
    
    // Add compatibility fields for existing code
    full_name: name,
    is_driver_active: (driverDetails.driver_status || 'active') === 'active',
    role: 'driver'
  };
}
