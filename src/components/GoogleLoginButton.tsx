import React, { useState } from 'react';
import { Chrome, Loader } from 'lucide-react';
import { supabaseAuthService } from '../lib/supabaseAuth';

interface GoogleLoginButtonProps {
  onSuccess: (userData: any) => void;
  onError: (error: string) => void;
  disabled?: boolean;
}

const GoogleLoginButton: React.FC<GoogleLoginButtonProps> = ({ 
  onSuccess, 
  onError, 
  disabled = false 
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = async () => {
    if (disabled || isLoading) return;
    
    setIsLoading(true);
    
    try {
      console.log('🔄 Starting Google OAuth login...');
      
      const { data, error } = await supabaseAuthService.signInWithGoogle();
      
      if (error) {
        throw new Error(error);
      }

      // The actual authentication will be handled by the auth state change listener
      // in the parent component, so we don't need to do anything else here
      console.log('✅ Google OAuth initiated successfully');
      
    } catch (error: any) {
      console.error('❌ Google login error:', error);
      onError(error.message || 'Google login failed');
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleGoogleLogin}
      disabled={disabled || isLoading}
      className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {isLoading ? (
        <>
          <Loader className="h-5 w-5 mr-3 animate-spin" />
          Connecting to Google...
        </>
      ) : (
        <>
          <Chrome className="h-5 w-5 mr-3 text-blue-500" />
          Continue with Google
        </>
      )}
    </button>
  );
};

export default GoogleLoginButton;