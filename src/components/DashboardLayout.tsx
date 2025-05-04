import React, { ReactNode, useEffect, useState } from 'react';
import { ShoppingBag, LogOut, Package, Users, BarChart2, Truck, PackagePlus, Home, Menu } from 'lucide-react';
import { useApp } from '../context/AppContext';
import Button from './ui/Button';
import { useLocation, Link } from 'react-router-dom';
import AdminBadge from './AdminBadge';

interface LayoutProps {
  children: ReactNode;
}

const DashboardLayout: React.FC<LayoutProps> = ({ children }) => {
  const { signOut, user } = useApp();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu when location changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);
  
  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: <Home className="h-4 w-4" /> },
    { name: 'Orders', path: '/dashboard/orders', icon: <Package className="h-4 w-4" /> },
    { name: 'New Order', path: '/dashboard/orders/new', icon: <PackagePlus className="h-4 w-4" /> },
    { name: 'Customers', path: '/dashboard/customers', icon: <Users className="h-4 w-4" /> },
    { name: 'Inventory', path: '/dashboard/inventory', icon: <BarChart2 className="h-4 w-4" /> },
    { name: 'Routes', path: '/dashboard/routes-drivers', icon: <Truck className="h-4 w-4" /> },
  ];

  // Check if current path matches or starts with the nav item path
  const isActivePath = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname === '/dashboard/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background-dark">
      {/* Header with brand and account */}
      <header className="bg-background py-3 px-4 md:px-6 border-b border-background-light flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center">
          <ShoppingBag className="h-5 w-5 text-accent mr-2" />
          <span className="text-lg font-bold tracking-tight">Cadillac's Goods</span>
        </div>
        
        <div className="flex items-center">
          {user && (
            <div className="flex items-center mr-4 hidden md:flex">
              <span className="text-sm mr-2">{user.username}</span>
              <AdminBadge />
            </div>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={signOut}
            className="flex items-center text-xs py-1.5 px-3"
          >
            <LogOut className="h-3.5 w-3.5 mr-1.5" />
            Sign Out
          </Button>
        </div>
      </header>

      {/* Navigation bar */}
      <nav className="bg-background border-b border-background-light sticky top-[61px] z-40">
        <div className="flex items-center justify-between px-4 md:px-6">
          {/* Desktop navigation */}
          <div className="hidden md:flex items-center space-x-1 overflow-x-auto">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center px-3 py-3 text-sm transition-colors ${
                  isActivePath(item.path)
                    ? 'text-accent border-b-2 border-accent'
                    : 'text-text-secondary hover:text-text-primary hover:bg-background-light/30'
                }`}
              >
                {React.cloneElement(item.icon, { 
                  className: `${item.icon.props.className} mr-1.5`
                })}
                <span>{item.name}</span>
              </Link>
            ))}
          </div>
          
          {/* Mobile menu button */}
          <button 
            className="md:hidden p-2 rounded-md hover:bg-background-light/30"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Menu</span>
          </button>
        </div>
        
        {/* Mobile navigation dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-background-light animate-fade-in">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center px-3 py-2 rounded-md ${
                    isActivePath(item.path)
                      ? 'bg-accent/10 text-accent'
                      : 'text-text-secondary hover:bg-background-light/30 hover:text-text-primary'
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {React.cloneElement(item.icon, { 
                    className: `${item.icon.props.className} mr-2`
                  })}
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>
      
      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
      
      {/* Footer */}
      <footer className="bg-background py-3 px-6 border-t border-background-light text-center text-xs text-text-secondary">
        © 2025 All rights reserved.
      </footer>
    </div>
  );
};

export default DashboardLayout;