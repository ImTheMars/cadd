import { createClient } from "npm:@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Create a Supabase client with the Auth context of the logged in user
    const supabaseClient = createClient(
      // Supabase API URL - env var exposed by default.
      Deno.env.get("SUPABASE_URL") ?? "",
      // Supabase API ANON KEY - env var exposed by default.
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      // Create client with Auth context of the user that called the function.
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const url = new URL(req.url);
    const customerId = url.searchParams.get("customerId");

    if (!customerId && url.pathname !== "/functions/v1/get_customer_stats/all") {
      return new Response(
        JSON.stringify({ error: "Customer ID is required as a query parameter" }),
        { 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json" 
          }, 
          status: 400 
        }
      );
    }

    let data;

    // If requesting stats for all customers
    if (url.pathname === "/functions/v1/get_customer_stats/all") {
      // First get all orders
      const { data: orders, error: ordersError } = await supabaseClient
        .from("orders")
        .select("id, customer_id, total_price");

      if (ordersError) {
        throw ordersError;
      }

      // Aggregate order data by customer
      const customerStats = {};
      
      for (const order of orders) {
        if (!order.customer_id) continue;
        
        if (!customerStats[order.customer_id]) {
          customerStats[order.customer_id] = {
            totalOrders: 0,
            totalSpent: 0
          };
        }
        
        customerStats[order.customer_id].totalOrders += 1;
        customerStats[order.customer_id].totalSpent += parseFloat(order.total_price);
      }
      
      data = customerStats;
    } else {
      // Get orders for a specific customer
      const { data: orders, error: ordersError } = await supabaseClient
        .from("orders")
        .select("id, total_price")
        .eq("customer_id", customerId);

      if (ordersError) {
        throw ordersError;
      }

      // Calculate totals
      const totalOrders = orders.length;
      const totalSpent = orders.reduce((sum, order) => sum + parseFloat(order.total_price), 0);
      const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;

      data = {
        totalOrders,
        totalSpent,
        averageOrderValue
      };
    }

    return new Response(
      JSON.stringify(data),
      { 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json" 
        } 
      }
    );
  } catch (error) {
    console.error(error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json" 
        }, 
        status: 500 
      }
    );
  }
});