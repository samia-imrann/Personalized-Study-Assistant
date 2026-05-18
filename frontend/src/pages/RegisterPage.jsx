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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative Orbs */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl -ml-20 -mt-20 pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl -mr-20 -mb-20 pointer-events-none"></div>
      
      <div className="max-w-md w-full bg-white rounded-3xl shadow-premium border border-slate-200/60 overflow-hidden relative z-10">
        <div className="p-8 pb-4 text-center bg-white">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-55 text-brand-600 border border-brand-100 bg-brand-50 shadow-glow-blue/20 mb-6">
            <BookOpen className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-display">Create Account</h1>
          <p className="text-slate-500 text-sm mt-2">Join AdaptIQ to start your adaptive learning</p>
        </div>
        
        <div className="p-8 pt-4 bg-white">
          {error && (
            <div className="mb-6 bg-rose-50 border border-rose-200 p-4 rounded-xl">
              <p className="text-rose-700 text-xs font-semibold">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">Username</label>
              <div className="relative">
                <User className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  required
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all duration-200 bg-white text-slate-900 placeholder-slate-400 text-sm"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="johndoe"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  required
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all duration-200 bg-white text-slate-900 placeholder-slate-400 text-sm"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">Password</label>
              <div className="relative">
                <KeyRound className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                <input
                  type="password"
                  required
                  minLength={6}
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all duration-200 bg-white text-slate-900 placeholder-slate-400 text-sm"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="•••••••• (min 6 chars)"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3.5 px-4 rounded-xl transition-all duration-200 disabled:bg-brand-300 disabled:cursor-not-allowed shadow-md shadow-brand-100 flex items-center justify-center space-x-2"
            >
              {isLoading && <Loader2 className="w-5 h-5 animate-spin text-white" />}
              <span>{isLoading ? 'Creating account...' : 'Create Account'}</span>
            </button>
          </form>

          <p className="mt-8 text-center text-slate-500 text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-600 font-bold hover:text-brand-700 transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
