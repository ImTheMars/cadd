import { ArrowRight, Layout } from 'lucide-react';
import Button from '../components/ui/Button';
import { useApp } from '../context/AppContext';

const LandingPage = () => {
  const { navigate, isAuthenticated, hasAdminRole, user } = useApp();
  
  // Check if user is an admin
  const isAdmin = hasAdminRole();
  
  // Log user info for debugging
  console.log('User:', user);
  console.log('Is authenticated:', isAuthenticated);
  console.log('Is admin:', isAdmin);

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-140px)]">
      <div className="container mx-auto px-6 md:px-12">
        <div className="max-w-2xl mx-auto animate-fade-in">
          <h1 className="text-4xl md:text-6xl font-bold mb-4 leading-tight">
            Welcome to <span className="text-accent">Cadillac's Goods</span>
          </h1>
          <p className="text-xl mb-6 text-text-secondary">
            We sell high quality goods in Orange County.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Authentication buttons */}
            {!isAuthenticated && (
              <>
                <Button size="lg" onClick={() => navigate('signup')}>
                  Join Now <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button variant="outline" size="lg" onClick={() => navigate('signin')}>
                  Sign In
                </Button>
              </>
            )}
            
            {/* Always show dashboard button if user is authenticated */}
            {isAuthenticated && (
              <Button 
                size="lg" 
                className="bg-purple-600 hover:bg-purple-700 font-bold"
                onClick={() => navigate('dashboard')}
              >
                Access Dashboard <Layout className="ml-2 h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;