import React, { useState, useEffect } from 'react';
import { LoginPage } from './components/LoginPage';
import { Dashboard } from './components/Dashboard';
import { UploadPage } from './components/UploadPage';
import { OnboardingModal } from './components/OnboardingModal';
import { FlaggedFiles } from './components/FlaggedFiles';
import { SafeUploads } from './components/SafeUploads';


export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState('upload');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    // Check if user is returning user
    const isFirstTime = !localStorage.getItem('safedrive_visited');
    if (isAuthenticated && isFirstTime) {
      setShowOnboarding(true);
      localStorage.setItem('safedrive_visited', 'true');
    }
  }, [isAuthenticated]);

  useEffect(() => {
    // Automatically check session on load
    fetch(   `${import.meta.env.VITE_API_BASE}/auth/user`, {
      credentials: 'include',
    })
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          setCurrentUser(data);
          setIsAuthenticated(true);
        }
      })
      .catch(err => {
        console.error('User fetch failed:', err);
      });
  }, []);

  const handleLogin = (user: any) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
  };

const handleLogout = async () => {
  try {
    await fetch(   `${import.meta.env.VITE_API_BASE}/auth/logout`, {
      credentials: "include"
    });
  } catch (e) {
    console.error("Logout failed:", e);
  }

  setCurrentUser(null);
  setIsAuthenticated(false);
  setCurrentPage('upload');
};


  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} darkMode={darkMode} toggleDarkMode={toggleDarkMode} />;
  }

  return (
    <div className={`min-h-screen transition-colors duration-200 ${
      darkMode ? 'dark bg-gray-900' : 'bg-gray-50'
    }`}>
      {currentPage === 'upload' && (
        <UploadPage 
          user={currentUser}
          onNavigate={setCurrentPage}
          onLogout={handleLogout}
          darkMode={darkMode}
          toggleDarkMode={toggleDarkMode}
          currentPage={currentPage}
        />
      )}
      
      {currentPage === 'dashboard' && (
        <Dashboard 
          user={currentUser}
          onNavigate={setCurrentPage}
          onLogout={handleLogout}
          darkMode={darkMode}
          toggleDarkMode={toggleDarkMode}
          currentPage={currentPage}
        />
      )}
    {currentPage === 'flagged' && (
  <FlaggedFiles
    user={currentUser}
    onNavigate={setCurrentPage}
    onLogout={handleLogout}
    darkMode={darkMode}
    toggleDarkMode={toggleDarkMode}
    currentPage={currentPage}
  />
)}

{currentPage === 'safe-uploads' && (
  <SafeUploads
    user={currentUser}
    onNavigate={setCurrentPage}
    onLogout={handleLogout}
    darkMode={darkMode}
    toggleDarkMode={toggleDarkMode}
    currentPage={currentPage}
  />
)}

      {showOnboarding && (
        <OnboardingModal onClose={() => setShowOnboarding(false)} darkMode={darkMode} />
      )}
    </div>
  );
}