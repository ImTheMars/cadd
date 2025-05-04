// Supabase Edge function to synchronize user role changes with Clerk
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// Initialize Clerk API configuration
const CLERK_API_KEY = Deno.env.get("CLERK_SECRET_KEY");
const CLERK_API_BASE = "https://api.clerk.dev/v1";

// Helper to update a user's metadata in Clerk
async function updateClerkUserMetadata(userId: string, role: string) {
  try {
    // Get the Clerk User ID from the Supabase user
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get the user's auth details to find their Clerk ID
    const { data: authUser, error: authError } = await supabaseClient.auth.admin.getUserById(userId);
    
    if (authError || !authUser) {
      console.error("Error fetching user auth data:", authError);
      throw new Error("User not found in auth system");
    }
    
    // Extract the Clerk user ID - typically available in the auth metadata
    // The exact path depends on how Clerk is integrated with your Supabase setup
    const clerkUserId = authUser.user.app_metadata.provider_id || authUser.user.id;
    
    if (!clerkUserId) {
      throw new Error("Clerk user ID not found");
    }

    // Update the user's public metadata in Clerk
    const response = await fetch(`${CLERK_API_BASE}/users/${clerkUserId}/metadata`, {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${CLERK_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        public_metadata: {
          role: role
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Error updating Clerk metadata:", errorData);
      throw new Error(`Failed to update Clerk metadata: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error in updateClerkUserMetadata:", error);
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { userId, role } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "User ID is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    if (!role) {
      return new Response(
        JSON.stringify({ error: "Role is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Update Clerk user metadata with new role
    const result = await updateClerkUserMetadata(userId, role);

    return new Response(
      JSON.stringify({ success: true, message: "User role updated in Clerk", result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Function error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});