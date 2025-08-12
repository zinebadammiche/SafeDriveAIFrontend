import React, { useEffect } from 'react';
import { Shield, Moon, Sun, Lock, Cloud, Zap } from 'lucide-react';
import { Button } from './ui/button';

interface LoginPageProps {
  onLogin: (user: any) => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
}

export function LoginPage({ onLogin, darkMode, toggleDarkMode }: LoginPageProps) {
  // Handle Google OAuth redirect back
  useEffect(() => {
    const checkAuth = async () => {
      try {
       const response = await fetch(`${import.meta.env.VITE_API_BASE}/auth/user`, {
 

          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          onLogin(data); // contains name, email, avatar, storageUsed, storageTotal
        }
      } catch (error) {
        console.error('Authentication check failed', error);
      }
    };

    checkAuth();
  }, [onLogin]);

  const handleGoogleSignIn = () => {
    window.location.href = `${import.meta.env.VITE_API_BASE}/auth/login`;
  };

  return (
    <div className={`min-h-screen flex ${darkMode ? 'dark bg-gray-900' : 'bg-gradient-to-br from-blue-50 to-emerald-50'}`}>
      {/* Header */}
      <div className="absolute top-4 right-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleDarkMode}
          className={`${darkMode ? 'text-gray-300 hover:text-white hover:bg-gray-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'} transition-colors`}
        >
          {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>

      {/* Left Side - Branding */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-md">
          <div className="flex items-center mb-8">
            <div className="p-3 bg-blue-600 rounded-xl mr-4">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>SafeDrive AI</h1>
              <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Intelligent & Secure Cloud Gateway</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-start space-x-4">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900 rounded-lg">
                <Lock className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className={`${darkMode ? 'text-white' : 'text-gray-900'} mb-1`}>Local Privacy Scanning</h3>
                <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  AI-powered detection of sensitive data before cloud upload
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Cloud className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className={`${darkMode ? 'text-white' : 'text-gray-900'} mb-1`}>Secure Cloud Transfer</h3>
                <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  End-to-end encryption with seamless Google Drive integration
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Zap className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className={`${darkMode ? 'text-white' : 'text-gray-900'} mb-1`}>Smart File Management</h3>
                <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Intelligent organization and AI-powered insights
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className={`w-full max-w-md space-y-8 ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl p-10 border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="text-center">
            <h2 className={`${darkMode ? 'text-white' : 'text-gray-900'} mb-2`}>Welcome to SafeDrive AI</h2>
            <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Sign in to access your secure cloud gateway
            </p>
          </div>

          <Button
            onClick={handleGoogleSignIn}
            className="w-full bg-white text-gray-900 border border-gray-300 hover:bg-gray-50 h-12 shadow-none hover:shadow-none focus:shadow-none transition-colors"
            style={{ boxShadow: 'none' }}
          >
            <svg className="h-5 w-5 mr-3" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </Button>

          <div className={`text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            <p>By signing in, you agree to our</p>
            <div className="space-x-1">
              <a href="#" className="text-blue-600 hover:underline">Terms of Service</a>
              <span>and</span>
              <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
