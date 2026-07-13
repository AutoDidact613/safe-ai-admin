import { useEffect } from 'react'
import "./styles/design-system.css";
import './App.css'
import AppRouter from './router/AppRouter'
import { initializeTokenManager, cleanupTokenManager } from './utils/tokenManager'

function App() {
  useEffect(() => {
    // Initialize token manager when app loads
    initializeTokenManager();

    // Cleanup on unmount
    return () => {
      cleanupTokenManager();
    };
  }, []);

  return (
    <>
      <AppRouter />
    </>
  );
}

export default App
