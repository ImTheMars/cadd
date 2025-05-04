/*
  # Create routes and route_orders tables

  1. New Tables
    - `routes`
      - `id` (uuid, primary key)
      - `name` (text)
      - `driver_id` (uuid, references profiles.id)
      - `status` (text, enum: scheduled, in-progress, completed, delayed)
      - `start_latitude` (double precision)
      - `start_longitude` (double precision)
      - `start_address` (text)
      - `estimated_completion_time` (timestamp with time zone)
      - `actual_start_time` (timestamp with time zone)
      - `actual_completion_time` (timestamp with time zone)
      - `total_distance` (numeric)
      - `notes` (text)
      - `created_at` (timestamp with time zone)
      - `updated_at` (timestamp with time zone)

    - `route_orders`
      - `id` (uuid, primary key)
      - `route_id` (uuid, references routes.id ON DELETE CASCADE)
      - `order_id` (integer, references orders.id ON DELETE CASCADE)
      - `stop_number` (integer)
      - `status` (text, enum: pending, completed, skipped)
      - `estimated_arrival_time` (timestamp with time zone)
      - `actual_arrival_time` (timestamp with time zone)
      - `created_at` (timestamp with time zone)
      - `updated_at` (timestamp with time zone)
  
  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage and view routes and route_orders based on roles
*/

-- Create an enum type for route status
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'route_status_enum') THEN
    CREATE TYPE route_status_enum AS ENUM ('scheduled', 'in-progress', 'completed', 'delayed');
  END IF;
END $$;

-- Create an enum type for route order status
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'route_order_status_enum') THEN
    CREATE TYPE route_order_status_enum AS ENUM ('pending', 'completed', 'skipped');
  END IF;
END $$;

-- Create routes table with separate latitude and longitude instead of geography type
CREATE TABLE IF NOT EXISTS routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  driver_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  status route_status_enum DEFAULT 'scheduled',
  start_latitude double precision,
  start_longitude double precision,
  start_address text,
  estimated_completion_time timestamptz,
  actual_start_time timestamptz,
  actual_completion_time timestamptz,
  total_distance numeric(10,2),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create route_orders table
CREATE TABLE IF NOT EXISTS route_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid REFERENCES routes(id) ON DELETE CASCADE,
  order_id integer REFERENCES orders(id) ON DELETE CASCADE,
  stop_number integer NOT NULL,
  status route_order_status_enum DEFAULT 'pending',
  estimated_arrival_time timestamptz,
  actual_arrival_time timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(route_id, order_id),
  UNIQUE(route_id, stop_number)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_routes_driver_id ON routes(driver_id);
CREATE INDEX IF NOT EXISTS idx_routes_status ON routes(status);
CREATE INDEX IF NOT EXISTS idx_route_orders_route_id ON route_orders(route_id);
CREATE INDEX IF NOT EXISTS idx_route_orders_order_id ON route_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_route_orders_status ON route_orders(status);
CREATE INDEX IF NOT EXISTS idx_routes_location ON routes(start_latitude, start_longitude);

-- Enable Row Level Security
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_orders ENABLE ROW LEVEL SECURITY;

-- Create Triggers for updated_at
CREATE TRIGGER set_routes_updated_at
BEFORE UPDATE ON routes
FOR EACH ROW
EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_route_orders_updated_at
BEFORE UPDATE ON route_orders
FOR EACH ROW
EXECUTE FUNCTION trigger_set_updated_at();

-- Create RLS Policies for routes
-- Allow drivers to view routes assigned to them
CREATE POLICY "Drivers can view their assigned routes"
  ON routes
  FOR SELECT
  TO authenticated
  USING (driver_id = auth.uid());

-- Allow managers and owners to view all routes
CREATE POLICY "Managers and owners can view all routes"
  ON routes
  FOR SELECT
  TO authenticated
  USING (get_my_role() IN ('manager', 'owner'));

-- Allow managers and owners to manage all routes
CREATE POLICY "Managers and owners can manage all routes"
  ON routes
  FOR ALL
  TO authenticated
  USING (get_my_role() IN ('manager', 'owner'))
  WITH CHECK (get_my_role() IN ('manager', 'owner'));

-- Create RLS Policies for route_orders
-- Allow drivers to view route_orders for their routes
CREATE POLICY "Drivers can view route_orders for their routes"
  ON route_orders
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM routes r
      WHERE r.id = route_orders.route_id
      AND r.driver_id = auth.uid()
    )
  );

-- Allow drivers to update status of route_orders for their routes
CREATE POLICY "Drivers can update status of their route_orders"
  ON route_orders
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM routes r
      WHERE r.id = route_orders.route_id
      AND r.driver_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM routes r
      WHERE r.id = route_orders.route_id
      AND r.driver_id = auth.uid()
    )
  );

-- Allow managers and owners to view all route_orders
CREATE POLICY "Managers and owners can view all route_orders"
  ON route_orders
  FOR SELECT
  TO authenticated
  USING (get_my_role() IN ('manager', 'owner'));

-- Allow managers and owners to manage all route_orders
CREATE POLICY "Managers and owners can manage all route_orders"
  ON route_orders
  FOR ALL
  TO authenticated
  USING (get_my_role() IN ('manager', 'owner'))
  WITH CHECK (get_my_role() IN ('manager', 'owner'));