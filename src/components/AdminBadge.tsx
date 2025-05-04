import { useApp } from '../context/AppContext';

interface AdminBadgeProps {
  showMessage?: boolean;
}

/**
 * AdminBadge component displays a badge indicating the user has admin permissions
 * and optionally displays a message explaining the admin role.
 */
const AdminBadge = ({ showMessage = false }: AdminBadgeProps) => {
  const { hasAdminRole } = useApp();
  
  if (!hasAdminRole()) return null;
  
  return (
    <div className="flex items-center">
      <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
        Admin
      </span>
      
      {showMessage && (
        <p className="ml-2 text-sm text-gray-600">
          You have administrator permissions
        </p>
      )}
    </div>
  );
};

export default AdminBadge;
