import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { BookOpen, User, Mail, KeyRound, Loader2 } from 'lucide-react';

export const RegisterPage = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await register(username, email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail?.[0]?.msg || err.response?.data?.detail || 'Failed to register account.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-theme-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative Orbs */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-theme-accent/5 rounded-full blur-3xl -ml-20 -mt-20 pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-theme-teal/5 rounded-full blur-3xl -mr-20 -mb-20 pointer-events-none"></div>
      
      <div className="max-w-md w-full bg-theme-card rounded-[32px] shadow-sm border border-theme-dark/5 overflow-hidden relative z-10 p-8">
        <div className="text-center pb-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-theme-accent/10 text-theme-accent mb-6">
            <BookOpen className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-display font-bold text-theme-dark uppercase tracking-wide">Create Account</h1>
          <p className="text-theme-dark/50 text-sm mt-1">Join AdaptIQ to start your adaptive learning</p>
        </div>
        
        <div className="mt-6">
          {error && (
            <div className="mb-6 bg-theme-pink/15 border border-theme-pink/20 p-4 rounded-2xl">
              <p className="text-theme-pink text-xs font-bold uppercase tracking-wide">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-theme-dark/50 mb-2 pl-2">Username</label>
              <div className="relative">
                <User className="absolute left-4 top-3.5 w-4 h-4 text-theme-dark/40" />
                <input
                  type="text"
                  required
                  className="w-full pl-12 pr-4 py-2.5 rounded-full border-none bg-theme-sidebar focus:ring-2 focus:ring-theme-accent text-theme-dark text-sm font-semibold transition-all"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="johndoe"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-theme-dark/50 mb-2 pl-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-3.5 w-4 h-4 text-theme-dark/40" />
                <input
                  type="email"
                  required
                  className="w-full pl-12 pr-4 py-2.5 rounded-full border-none bg-theme-sidebar focus:ring-2 focus:ring-theme-accent text-theme-dark text-sm font-semibold transition-all"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-theme-dark/50 mb-2 pl-2">Password</label>
              <div className="relative">
                <KeyRound className="absolute left-4 top-3.5 w-4 h-4 text-theme-dark/40" />
                <input
                  type="password"
                  required
                  minLength={6}
                  className="w-full pl-12 pr-4 py-2.5 rounded-full border-none bg-theme-sidebar focus:ring-2 focus:ring-theme-accent text-theme-dark text-sm font-semibold transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="•••••••• (min 6 chars)"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-theme-accent hover:bg-theme-accent/90 text-white font-bold py-2.5 px-4 rounded-full transition-all disabled:bg-theme-sidebar/55 flex items-center justify-center space-x-2"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin text-white" />}
              <span>{isLoading ? 'Creating account...' : 'Create Account'}</span>
            </button>
          </form>

          <p className="mt-8 text-center text-theme-dark/60 text-sm font-semibold">
            Already have an account?{' '}
            <Link to="/login" className="text-theme-accent font-bold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
