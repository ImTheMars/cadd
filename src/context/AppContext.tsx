import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

type Page = 'landing' | 'signin' | 'signup' | 'dashboard';

interface User {
  email: string;
  name?: string;
  username?: string;
  role?: 'admin' | 'user';
  publicMetadata?: {
    role?: string;
  };
}

interface AppContextType {
  currentPage: Page;
  navigate: (page: Page) => void;
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  hasAdminRole: () => boolean;
  signIn: (emailOrUsername: string, password: string, remember?: boolean) => Promise<boolean>;
  signUp: (email: string, password: string, name?: string, username?: string) => Promise<boolean>;
  signOut: () => void;
}

const USER_STORAGE_KEY = 'cadillac_goods_user';

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentPage, setCurrentPage] = useState<Page>('landing');
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const routerNavigate = useNavigate();
  const location = useLocation();
  
  // Check if user has admin role from Clerk publicMetadata or local role property
  const hasAdminRole = (): boolean => {
    if (!user) return false;
    
    // Check Clerk public metadata first (if available)
    if (user.publicMetadata?.role === 'admin') return true;
    
    // Fall back to local role property
    return user.role === 'admin';
  };

  // Load user from localStorage on initial render
  useEffect(() => {
    const storedUser = localStorage.getItem(USER_STORAGE_KEY);
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        
        // Set admin status based on the user's role
        const adminStatus = parsedUser.role === 'admin' || parsedUser.publicMetadata?.role === 'admin';
        setIsAdmin(adminStatus);
        
        // Log user status for debugging
        console.log('User loaded from storage:', parsedUser);
        console.log('Admin status:', adminStatus);
        console.log('Current path:', location.pathname);
        
        // TEMPORARILY DISABLED: Only keeping the redirect to dashboard, disabling the redirect away from dashboard
        // This will allow any authenticated user to access the dashboard for testing
        if ((location.pathname === '/' || location.pathname === '/signin' || location.pathname === '/signup') && adminStatus) {
          routerNavigate('/dashboard');
        }
        // DISABLED: This was preventing access to dashboard
        // else if (location.pathname.startsWith('/dashboard') && !adminStatus) {
        //   routerNavigate('/');
        // }
      } catch (e) {
        console.error('Failed to parse stored user:', e);
        localStorage.removeItem(USER_STORAGE_KEY);
      }
    }
  }, [location.pathname, routerNavigate]);

  // Update currentPage based on location
  useEffect(() => {
    if (location.pathname.startsWith('/dashboard')) {
      setCurrentPage('dashboard');
    } else if (location.pathname === '/signin') {
      setCurrentPage('signin');
    } else if (location.pathname === '/signup') {
      setCurrentPage('signup');
    } else {
      setCurrentPage('landing');
    }
  }, [location.pathname]);

  const navigate = (page: Page) => {
    setCurrentPage(page);
    
    // Map page to route
    let route = '/';
    if (page === 'signin') route = '/signin';
    if (page === 'signup') route = '/signup';
    if (page === 'dashboard') route = '/dashboard';
    
    // Use React Router's navigate
    routerNavigate(route);
    
    // Scroll to top when navigating
    window.scrollTo(0, 0);
  };

  const signIn = async (emailOrUsername: string, password: string, remember = false): Promise<boolean> => {
    // This is a mock implementation. In a real app, you would call an API.
    if (emailOrUsername && password.length >= 6) {
      // For testing purposes: set admin role if email contains 'admin'
      const isAdminUser = emailOrUsername.toLowerCase().includes('admin');
      
      const newUser: User = { 
        email: emailOrUsername.includes('@') ? emailOrUsername : `${emailOrUsername}@example.com`,
        username: emailOrUsername.includes('@') ? emailOrUsername.split('@')[0] : emailOrUsername,
        role: isAdminUser ? 'admin' : 'user', // Set role based on email
        publicMetadata: {
          role: isAdminUser ? 'admin' : 'user'
        }
      };
      
      setUser(newUser);
      setIsAdmin(isAdminUser); // Update admin status
      
      // Store user in localStorage if remember is true
      if (remember) {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser));
      }
      
      // TEMPORARILY MODIFIED: Allow any user to access dashboard
      console.log('User signed in:', newUser);
      console.log('Is admin user:', isAdminUser);
      
      // Navigate all users to dashboard for testing purposes
      routerNavigate('/dashboard');
      
      /* DISABLED FOR TESTING
      if (isAdminUser) {
        routerNavigate('/dashboard');
      } else {
        alert('You do not have admin permissions to access the dashboard.');
      }
      */
      
      return true;
    }
    return false;
  };

  const signUp = async (email: string, password: string, name?: string, username?: string): Promise<boolean> => {
    // This is a mock implementation. In a real app, you would call an API.
    if (email && password.length >= 6) {
      // For testing purposes: set admin role if email contains 'admin'
      const isAdminUser = email.toLowerCase().includes('admin');
      
      const newUser: User = { 
        email, 
        name,
        username: username || email.split('@')[0],
        role: isAdminUser ? 'admin' : 'user', // Set role based on email
        publicMetadata: {
          role: isAdminUser ? 'admin' : 'user'
        }
      };
      
      setUser(newUser);
      setIsAdmin(isAdminUser); // Update admin status
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser));
      
      // TEMPORARILY MODIFIED: Allow any user to access dashboard
      console.log('User signed up:', newUser);
      console.log('Is admin user:', isAdminUser);
      
      // Navigate all users to dashboard for testing purposes
      routerNavigate('/dashboard');
      
      /* DISABLED FOR TESTING
      if (isAdminUser) {
        routerNavigate('/dashboard');
      } else {
        routerNavigate('/');
        alert('Note: You do not have admin permissions to access the dashboard.');
      }
      */
      return true;
    }
    return false;
  };

  const signOut = () => {
    setUser(null);
    setIsAdmin(false); // Reset admin status
    localStorage.removeItem(USER_STORAGE_KEY);
    routerNavigate('/');
  };

  const value = {
    currentPage,
    navigate,
    user,
    isAuthenticated: !!user,
    isAdmin: isAdmin,
    hasAdminRole,
    signIn,
    signUp,
    signOut
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}