import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

const SignIn = () => {
  const { signIn } = useApp();
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    
    try {
      const success = await signIn(emailOrUsername, password, rememberMe);
      if (!success) {
        setError('Invalid username/email or password. Please try again.');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-180px)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-background rounded-lg shadow-lg overflow-hidden animate-fade-in">
        <div className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold">Sign In</h1>
            <p className="text-text-secondary mt-2">Welcome back to Cadillac's Goods</p>
          </div>
          
          {error && (
            <div className="bg-red-900/20 border border-red-500 text-red-300 p-4 rounded-lg mb-6">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <Input
              label="Username or Email"
              type="text"
              placeholder="your_username or your@email.com"
              value={emailOrUsername}
              onChange={(e) => setEmailOrUsername(e.target.value)}
              required
              fullWidth
            />
            
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              fullWidth
            />
            
            <div className="flex justify-between items-center mt-2 mb-6">
              <label className="flex items-center text-sm">
                <input 
                  type="checkbox" 
                  className="mr-2 h-4 w-4"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                Remember me
              </label>
              <a href="#" className="text-accent text-sm hover:underline">
                Forgot password?
              </a>
            </div>
            
            <Button
              type="submit"
              fullWidth
              isLoading={isLoading}
              disabled={isLoading}
            >
              Sign In
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-text-secondary">
              Don't have an account?{' '}
              <button
                className="text-accent hover:underline"
                onClick={() => useApp().navigate('signup')}
              >
                Sign Up
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignIn;