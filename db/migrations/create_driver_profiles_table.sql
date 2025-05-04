-- Create driver_profiles table
CREATE TABLE driver_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_user_id TEXT NOT NULL UNIQUE,
  driver_status TEXT DEFAULT 'active',
  current_location JSONB,
  vehicle_details JSONB,
  license_number TEXT,
  driver_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an index on clerk_user_id for faster lookups
CREATE INDEX idx_driver_profiles_clerk_user_id ON driver_profiles (clerk_user_id);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_driver_profile_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically update updated_at
CREATE TRIGGER set_driver_profile_timestamp
BEFORE UPDATE ON driver_profiles
FOR EACH ROW
EXECUTE FUNCTION update_driver_profile_timestamp();
