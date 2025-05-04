import { supabase } from './supabase';
import { Driver, DriverProfile } from '../types/driver.types';
import { ClerkUser } from './clerk';

/**
 * Fetches driver profile details from Supabase
 * @param clerkUserId Clerk user ID
 * @returns Driver profile data or null
 */
export async function getDriverProfileByClerkId(clerkUserId: string): Promise<DriverProfile | null> {
  try {
    const { data, error } = await supabase
      .from('driver_profiles')
      .select('*')
      .eq('clerk_user_id', clerkUserId)
      .single();
      
    if (error && error.code !== 'PGRST116') { // PGRST116 is the "no rows returned" error
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching driver profile:', error);
    return null;
  }
}

/**
 * Fetches all driver profiles from Supabase
 * @returns Array of driver profiles
 */
export async function getAllDriverProfiles() {
  try {
    const { data, error } = await supabase
      .from('driver_profiles')
      .select('*');
      
    if (error) {
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Error fetching all driver profiles:', error);
    return [];
  }
}

/**
 * Creates or updates a driver profile in Supabase
 * @param driverProfile Driver profile data
 * @returns The created/updated profile or null on error
 */
export async function upsertDriverProfile(driverProfile: any) {
  try {
    const { data, error } = await supabase
      .from('driver_profiles')
      .upsert({
        clerk_user_id: driverProfile.clerk_user_id,
        driver_status: driverProfile.driver_status,
        current_location: driverProfile.current_location,
        vehicle_details: driverProfile.vehicle_details,
        license_number: driverProfile.license_number,
        driver_image_url: driverProfile.driver_image_url
      }, {
        onConflict: 'clerk_user_id'
      })
      .select()
      .single();
      
    if (error) {
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error upserting driver profile:', error);
    return null;
  }
}

/**
 * Updates driver status in Supabase
 * @param clerkUserId Clerk user ID
 * @param status New driver status
 * @returns The updated profile or null on error
 */
export async function updateDriverStatus(clerkUserId: string, status: string) {
  try {
    const { data, error } = await supabase
      .from('driver_profiles')
      .update({ driver_status: status })
      .eq('clerk_user_id', clerkUserId)
      .select()
      .single();
      
    if (error) {
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error updating driver status:', error);
    return null;
  }
}

/**
 * Fetches all drivers by combining Clerk user data with Supabase profile data
 * @returns Array of complete driver objects
 */
export async function fetchAllDrivers() {
  try {
    // First, get all driver profiles from Supabase
    const supabaseDriverProfiles = await getAllDriverProfiles();
    
    // Call the Edge Function to get all Clerk users with driver role
    const { data, error } = await supabase.functions.invoke('clerk-admin/all-drivers');
    
    if (error) {
      console.error('Error calling clerk-admin function:', error);
      // Fall back to using only the Supabase profiles without Clerk data
      return supabaseDriverProfiles.map(profile => {
        return {
          id: profile.id,
          clerk_user_id: profile.clerk_user_id,
          name: 'Driver ' + profile.clerk_user_id.substring(0, 6),
          email: '',
          phone: '',
          profile_image_url: profile.driver_image_url || '',
          driver_status: profile.driver_status || 'active',
          current_location: profile.current_location || null,
          vehicle_details: profile.vehicle_details || null,
          license_number: profile.license_number || '',
          created_at: profile.created_at,
          updated_at: profile.updated_at,
          full_name: 'Driver ' + profile.clerk_user_id.substring(0, 6),
          is_driver_active: profile.driver_status === 'active',
          role: 'driver'
        };
      });
    }
    
    const clerkDrivers = data.drivers || [];
    
    // Map clerk users to our driver format, including Supabase profile data
    const drivers = clerkDrivers.map((clerkUser: ClerkUser) => {
      const driverProfile = supabaseDriverProfiles.find(
        profile => profile.clerk_user_id === clerkUser.id
      ) || {} as DriverProfile;
      
      // Extract first and last name for consistent display
      const firstName = clerkUser.firstName || '';
      const lastName = clerkUser.lastName || '';
      const fullName = `${firstName} ${lastName}`.trim() || 'Unknown';
      
      return {
        id: clerkUser.id,
        clerk_user_id: clerkUser.id,
        name: fullName,
        email: clerkUser.emailAddresses?.[0]?.emailAddress || '',
        phone: clerkUser.phoneNumbers?.[0]?.phoneNumber || '',
        profile_image_url: clerkUser.imageUrl || driverProfile.driver_image_url || '',
        driver_status: driverProfile.driver_status || 'active',
        current_location: driverProfile.current_location || null,
        vehicle_details: driverProfile.vehicle_details || null,
        license_number: driverProfile.license_number || '',
        created_at: driverProfile.created_at || clerkUser.createdAt,
        updated_at: driverProfile.updated_at || clerkUser.updatedAt,
        
        // Add compatibility fields for existing code
        full_name: fullName,
        is_driver_active: (driverProfile.driver_status || 'active') === 'active',
        role: 'driver'
      };
    });
    
    return drivers;
  } catch (error) {
    console.error('Error fetching all drivers:', error);
    return [];
  }
}

/**
 * Deletes a driver profile from Supabase
 * @param clerkUserId Clerk user ID
 * @returns Success boolean
 */
export async function deleteDriverProfile(clerkUserId: string) {
  try {
    const { error } = await supabase
      .from('driver_profiles')
      .delete()
      .eq('clerk_user_id', clerkUserId);
      
    if (error) {
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting driver profile:', error);
    return false;
  }
}
