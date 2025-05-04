/*
  # Create driver_profiles table

  1. New Tables
    - `driver_profiles`
      - `id` (uuid, primary key, foreign key referencing profiles.id ON DELETE CASCADE)
      - `vehicle_type` (text)
      - `license_number` (text)
      - `is_active` (boolean, default false)
      - `current_location` (geography(POINT))
      - `driver_status` (text, enum: active, on-delivery, off-duty, on-break)
      - `created_at` (timestamp with time zone)
      - `updated_at` (timestamp with time zone)
  
  2. Security
    - Enable RLS on `driver_profiles` table
    - Add policies for authenticated users to manage and view driver profiles based on roles
    
  3. Indexes
    - Add index on `is_active` and `driver_status` for efficient queries
*/

-- Create an enum type for driver status
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'driver_status_enum') THEN
    CREATE TYPE driver_status_enum AS ENUM ('active', 'on-delivery', 'off-duty', 'on-break');
  END IF;
END $$;

-- Create driver_profiles table
CREATE TABLE IF NOT EXISTS driver_profiles (
  id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  vehicle_type text,
  license_number text,
  vehicle_make text,
  vehicle_model text,
  vehicle_year int,
  license_plate text,
  is_active boolean DEFAULT false,
  current_location geography(POINT),
  driver_status driver_status_enum DEFAULT 'off-duty',
  last_location_update timestamptz,
  max_concurrent_orders int DEFAULT 1,
  preferred_zones text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_driver_profiles_is_active ON driver_profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_driver_profiles_driver_status ON driver_profiles(driver_status);
CREATE INDEX IF NOT EXISTS idx_driver_profiles_current_location ON driver_profiles USING GIST (current_location);

-- Enable Row Level Security
ALTER TABLE driver_profiles ENABLE ROW LEVEL SECURITY;

-- Create Trigger for updated_at
CREATE TRIGGER set_driver_profiles_updated_at
BEFORE UPDATE ON driver_profiles
FOR EACH ROW
EXECUTE FUNCTION trigger_set_updated_at();

-- Create RLS Policies
-- Allow drivers to view and update their own profile
CREATE POLICY "Drivers can view their own profile"
  ON driver_profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Drivers can update their own profile"
  ON driver_profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Allow managers and owners to view all driver profiles
CREATE POLICY "Managers and owners can view all driver profiles"
  ON driver_profiles
  FOR SELECT
  TO authenticated
  USING (get_my_role() IN ('manager', 'owner'));

-- Allow managers and owners to manage all driver profiles
CREATE POLICY "Managers and owners can manage all driver profiles"
  ON driver_profiles
  FOR ALL
  TO authenticated
  USING (get_my_role() IN ('manager', 'owner'))
  WITH CHECK (get_my_role() IN ('manager', 'owner'));