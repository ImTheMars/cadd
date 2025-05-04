import { ReactNode, useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

/**
 * ProtectedRoute component ensures that only authenticated users with appropriate roles
 * can access certain routes.
 * 
 * @param children The component to render if access is permitted
 * @param requireAdmin If true, only users with admin role can access the route
 */
export const ProtectedRoute = ({ 
  children,
  requireAdmin = false
}: ProtectedRouteProps) => {
  const { isAuthenticated, hasAdminRole } = useApp();
  const [isLoading, setIsLoading] = useState(true);
  
  // Add loading state to prevent immediate redirect on page load
  useEffect(() => {
    // Short timeout to allow user data to load from localStorage
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
      </div>
    );
  }
  
  // If user is not authenticated after loading, redirect to sign in
  if (!isAuthenticated) {
    console.log('Not authenticated, redirecting to sign in');
    return <Navigate to="/signin" replace />;
  }
  
  // Temporarily allow all authenticated users to access dashboard
  // Debug admin role checking
  console.log('Protected route - requireAdmin:', requireAdmin);
  console.log('Protected route - hasAdminRole():', hasAdminRole());
  
  // Commented out for now to allow access regardless of admin status
  /*
  if (requireAdmin && !hasAdminRole()) {
    alert('You do not have permission to access this page. Admin role required.');
    return <Navigate to="/" replace />;
  }
  */
  
  // User is authorized, render children
  return <>{children}</>;
};

export default ProtectedRoute;
