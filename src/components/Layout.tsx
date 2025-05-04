import React, { ReactNode } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import { useLocation } from 'react-router-dom';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const isDashboard = location.pathname.startsWith('/dashboard');

  return (
    <div className="min-h-screen flex flex-col bg-background-dark">
      {!isDashboard && <Navbar />}
      <main className={`flex-1 ${isDashboard ? 'h-screen' : ''}`}>
        {children}
      </main>
      {!isDashboard && <Footer />}
    </div>
  );
};

export default Layout;