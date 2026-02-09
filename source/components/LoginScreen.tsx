import React, { useState } from 'react';
import { signInWithGoogle } from '../services/authService';
import { Trophy, LogIn, Loader2 } from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
      onLoginSuccess();
    } catch (err: any) {
      console.error('Sign-in failed:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError(null); // User cancelled, not a real error
      } else {
        setError(err.message || 'Sign-in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cyber-bg flex items-center justify-center relative overflow-hidden">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-cyber-purple/20 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-cyber-cyan/10 blur-[120px] rounded-full" />
        <div className="absolute top-[40%] right-[20%] w-[30%] h-[30%] bg-cyber-pink/10 blur-[100px] rounded-full animate-pulse" />
      </div>

      <div className="relative z-10 glass-panel p-10 rounded-2xl border border-white/10 max-w-md w-full mx-4 text-center">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-2">
          <Trophy className="text-cyber-cyan w-12 h-12" />
        </div>
        <h1 className="font-display font-bold text-4xl tracking-wider text-white mb-1">
          CYBER<span className="text-cyber-cyan">PONG</span>
        </h1>
        <p className="text-gray-500 text-sm font-mono mb-8">ARCADE LEAGUE</p>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-cyber-cyan/30 to-transparent mb-8" />

        {/* Sign In Button */}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white/5 border border-white/20 text-white px-6 py-4 rounded-xl font-bold text-lg hover:bg-white/10 hover:border-cyber-cyan/50 hover:shadow-[0_0_20px_rgba(0,243,255,0.15)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group"
        >
          {loading ? (
            <Loader2 className="animate-spin" size={24} />
          ) : (
            <>
              {/* Google Icon SVG */}
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span className="group-hover:text-cyber-cyan transition-colors">Sign in with Google</span>
            </>
          )}
        </button>

        {error && (
          <p className="mt-4 text-red-400 text-sm font-mono">{error}</p>
        )}

        <p className="mt-6 text-gray-600 text-xs">
          Sign in to join the league and start competing.
        </p>
      </div>
    </div>
  );
};

export default LoginScreen;
