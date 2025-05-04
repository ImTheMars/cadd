import React, { useState, useEffect } from 'react';
import { ShieldCheck } from 'lucide-react';
import Button from './ui/Button';
import { supabase } from '../lib/supabase';

interface DriverFormProps {
  driverId?: string;
  onSave: () => void;
  onCancel: () => void;
}

interface DriverStatus {
  driver_status: string;
  is_driver_active: boolean;
}

const DriverForm: React.FC<DriverFormProps> = ({ driverId, onSave, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<DriverStatus>({
    driver_status: 'active',
    is_driver_active: true
  });

  useEffect(() => {
    // Fetch driver status if in edit mode
    const fetchDriverStatus = async () => {
      if (!driverId) return;
      
      setLoading(true);
      try {
        // Get from driver_profiles table by clerk_user_id
        const { data, error } = await supabase
          .from('driver_profiles')
          .select('driver_status, is_driver_active')
          .eq('clerk_user_id', driverId)
          .single();
          
        if (error) {
          console.error('Error fetching driver profile:', error);
          return;
        }
        
        if (data) {
          setFormData({
            driver_status: data.driver_status || 'active',
            is_driver_active: data.is_driver_active === false ? false : true
          });
        }
      } catch (err) {
        console.error('Error fetching driver status:', err);
        setError('Failed to load driver status');
      } finally {
        setLoading(false);
      }
    };

    fetchDriverStatus();
  }, [driverId]);

  const handleChange = (
    e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>
  ) => {
    const { name, value, type } = e.target;
    
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' 
        ? (e.target as HTMLInputElement).checked 
        : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      if (driverId) {
        // Update existing driver profile - only update status fields
        const { error } = await supabase
          .from('driver_profiles')
          .update({
            driver_status: formData.driver_status,
            is_driver_active: formData.is_driver_active,
            updated_at: new Date().toISOString()
          })
          .eq('clerk_user_id', driverId);

        if (error) throw error;
        
        onSave();
      } else {
        // This form is only for editing existing drivers
        setError('This form is only for editing existing drivers');
      }
    } catch (err) {
      console.error('Error updating driver status:', err);
      setError('Failed to update driver status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background/90 backdrop-blur-sm p-6 rounded-lg shadow-lg">
      <h2 className="text-xl font-semibold mb-6 flex items-center">
        Edit Driver Status
      </h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded-md text-red-300">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2" htmlFor="driver_status">Driver Status</label>
            <div className="relative">
              <ShieldCheck className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-secondary" />
              <select
                id="driver_status"
                name="driver_status"
                value={formData.driver_status || 'active'}
                onChange={handleChange}
                className="w-full bg-background-light border-2 border-background-light px-3 py-2 pl-10 rounded-md text-text-primary"
              >
                <option value="active">Active</option>
                <option value="on-delivery">On Delivery</option>
                <option value="off-duty">Off Duty</option>
                <option value="on-break">On Break</option>
              </select>
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_driver_active"
              name="is_driver_active"
              className="h-4 w-4 text-accent focus:ring-accent border-gray-300 rounded"
              checked={formData.is_driver_active}
              onChange={handleChange}
            />
            <label htmlFor="is_driver_active" className="ml-2 block text-sm">
              Driver is available for route assignments
            </label>
          </div>
        </div>
        
        <div className="mt-8 flex justify-end space-x-3">
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" isLoading={loading}>
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
};

export default DriverForm;
