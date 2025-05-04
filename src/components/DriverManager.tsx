import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { fetchAllDrivers } from '../lib/driverService';
import { Driver } from '../types/driver.types';
import Button from './ui/Button';
import Input from './ui/Input';

/**
 * Component that allows administrators to easily add drivers by username
 */
const DriverManager = () => {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [newDrivers, setNewDrivers] = useState<any[]>([]);

  const handleAddDriver = async () => {
    if (!username) {
      setError('Please enter a username or email');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Call the Supabase Edge Function to find and add the driver
      const { data, error: fnError } = await supabase.functions.invoke('clerk-admin/add-driver', {
        body: { username }
      });
      
      if (fnError || (data && data.error)) {
        const errorMessage = data?.error || fnError?.message || `User "${username}" not found`;
        setError(errorMessage);
        return;
      }

      if (!data || !data.userData || !data.driverProfile) {
        setError(`Failed to set ${username} as a driver`);
        return;
      }

      // Update success message
      setSuccess(`${username} has been added as a driver successfully!`);
      setUsername('');
      
      // Fetch the updated list of drivers to display the new one
      const drivers = await fetchAllDrivers();
      const newDriver = drivers.find((d: Driver) => d.clerk_user_id === data.userData.id);
      
      if (newDriver) {
        setNewDrivers(prev => [newDriver, ...prev]);
      }
    } catch (err) {
      console.error('Error adding driver:', err);
      setError('An error occurred while adding the driver');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background rounded-lg p-6 shadow-sm">
      <h2 className="text-xl font-semibold mb-4">Add New Driver</h2>
      
      <div className="flex gap-4 mb-4">
        <Input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter Clerk username or email"
          className="flex-1"
          disabled={loading}
        />
        <Button
          onClick={handleAddDriver}
          disabled={loading || !username}
          variant="primary"
        >
          {loading ? 'Adding...' : 'Add Driver'}
        </Button>
      </div>
      
      {error && (
        <div className="bg-red-500/20 text-red-700 p-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-500/20 text-green-700 p-3 rounded mb-4">
          {success}
        </div>
      )}
      
      {newDrivers.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-medium mb-2">Recently Added Drivers</h3>
          <div className="bg-background-light rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-background-light/50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-text-secondary">Name</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-text-secondary">Status</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-text-secondary">Added</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-background-light">
                {newDrivers.map((driver) => (
                  <tr key={driver.id} className="hover:bg-background-light/30">
                    <td className="px-4 py-3 text-sm font-medium">
                      {driver.name || 'Unknown'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-700">
                        {driver.driver_status || 'active'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {new Date(driver.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      <div className="mt-6 text-sm text-text-secondary">
        <p>Note: The user must already have a Clerk account before you can add them as a driver.</p>
        <p>You can use either their username or email address to find them.</p>
      </div>
    </div>
  );
};

export default DriverManager;
