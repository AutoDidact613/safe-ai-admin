import { useEffect } from 'react'
import "./styles/design-system.css";
import './App.css'
import AppRouter from './router/AppRouter'
import { AuthProvider } from './context/AuthContext'
import { initializeTokenManager, cleanupTokenManager } from './utils/tokenManager'
import { useLanguageDirection } from './i18n/useLanguageDirection'


function App() {
  useLanguageDirection();
  
  useEffect(() => {
    // Initialize token manager when app loads
    initializeTokenManager();

    // Cleanup on unmount
    return () => {
      cleanupTokenManager();
    };
  }, []);

  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}

export default App
