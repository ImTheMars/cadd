import React, { useState } from 'react';
import { Menu, X, ShoppingBag } from 'lucide-react';
import { useApp } from '../context/AppContext';
import Button from './ui/Button';

const Navbar = () => {
  const { navigate, isAuthenticated, signOut } = useApp();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <nav className="bg-background py-4 px-6 md:px-12 sticky top-0 z-50 backdrop-blur-md bg-opacity-90">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div 
          className="flex items-center cursor-pointer" 
          onClick={() => navigate('landing')}
        >
          <ShoppingBag className="h-8 w-8 text-accent mr-2" />
          <span className="text-xl font-bold tracking-tight">Cadillac's Goods</span>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-6">
          {isAuthenticated ? (
            <Button variant="outline" onClick={signOut}>Sign Out</Button>
          ) : (
            <div className="flex items-center space-x-4">
              <Button variant="outline" onClick={() => navigate('signin')}>Sign In</Button>
              <Button onClick={() => navigate('signup')}>Sign Up</Button>
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden">
          <button 
            onClick={toggleMenu} 
            className="p-2 rounded-full hover:bg-background-light transition-colors"
          >
            {isMenuOpen ? (
              <X className="h-6 w-6 text-text-primary" />
            ) : (
              <Menu className="h-6 w-6 text-text-primary" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden p-4 bg-background-light mt-2 rounded-lg animate-fade-in">
          <div className="flex flex-col space-y-4">
            {isAuthenticated ? (
              <Button variant="outline" onClick={() => { signOut(); setIsMenuOpen(false); }}>
                Sign Out
              </Button>
            ) : (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => { navigate('signin'); setIsMenuOpen(false); }}
                  className="w-full"
                >
                  Sign In
                </Button>
                <Button 
                  onClick={() => { navigate('signup'); setIsMenuOpen(false); }}
                  className="w-full"
                >
                  Sign Up
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;