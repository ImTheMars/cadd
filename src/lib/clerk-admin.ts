// This file should only be used in secure server environments
// NEVER include this file in client-side code
import { upsertDriverProfile } from './driverService';

const CLERK_API_URL = 'https://api.clerk.com/v1';
const CLERK_SECRET_KEY = 'sk_test_veLPSPJzP3CltVo85UzFp09fr66EDrgpo5MIetvig3';

/**
 * Searches for a user by their username or email
 * @param usernameOrEmail The username or email to search for
 * @returns The user if found, null if not found
 */
export async function findUserByUsernameOrEmail(usernameOrEmail: string) {
  try {
    // First, try searching by email
    let response = await fetch(`${CLERK_API_URL}/users?email_address=${encodeURIComponent(usernameOrEmail)}`, {
      headers: {
        Authorization: `Bearer ${CLERK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    let data = await response.json();
    
    if (data && data.length > 0) {
      return data[0];
    }
    
    // If not found by email, try username
    response = await fetch(`${CLERK_API_URL}/users?username=${encodeURIComponent(usernameOrEmail)}`, {
      headers: {
        Authorization: `Bearer ${CLERK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    data = await response.json();
    
    if (data && data.length > 0) {
      return data[0];
    }
    
    return null;
  } catch (error) {
    console.error('Error finding user:', error);
    return null;
  }
}

/**
 * Sets a user's role to 'driver' in Clerk
 * @param userId The Clerk user ID
 * @returns Success boolean
 */
export async function setUserAsDriver(userId: string) {
  try {
    const response = await fetch(`${CLERK_API_URL}/users/${userId}/metadata`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${CLERK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        public_metadata: {
          role: 'driver'
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to set user as driver: ${response.statusText}`);
    }

    // Create or update the driver profile in Supabase
    const profile = await createDriverProfileForClerkUser(userId);
    
    if (!profile) {
      throw new Error('Failed to create driver profile in database');
    }
    
    return true;
  } catch (error) {
    console.error('Error setting user as driver:', error);
    return false;
  }
}

/**
 * Creates a driver profile in Supabase for a Clerk user
 * @param clerkUserId The Clerk user ID
 * @returns The created profile or null on error
 */
export async function createDriverProfileForClerkUser(clerkUserId: string) {
  try {
    // Get user details from Clerk
    const response = await fetch(`${CLERK_API_URL}/users/${clerkUserId}`, {
      headers: {
        Authorization: `Bearer ${CLERK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get user details: ${response.statusText}`);
    }

    const userData = await response.json();

    // Create a driver profile in Supabase
    const driverProfile = {
      clerk_user_id: clerkUserId,
      driver_status: 'active',
      driver_image_url: userData.image_url
    };

    const result = await upsertDriverProfile(driverProfile);
    return result;
  } catch (error) {
    console.error('Error creating driver profile:', error);
    return null;
  }
}

/**
 * Gets all users with driver role from Clerk
 * @returns Array of driver users
 */
export async function getAllDriverUsers() {
  try {
    // Get all users
    const response = await fetch(`${CLERK_API_URL}/users?limit=100`, {
      headers: {
        Authorization: `Bearer ${CLERK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get users: ${response.statusText}`);
    }

    const users = await response.json();
    
    // Filter for users with driver role
    return users.filter(
      (user: any) => user.public_metadata?.role === 'driver'
    );
  } catch (error) {
    console.error('Error getting driver users:', error);
    return [];
  }
}
