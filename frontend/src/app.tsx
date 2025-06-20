import { Router, Route } from 'preact-router';
import { useEffect, useState } from 'preact/hooks';
import { storageService } from './services/storage';
// Import services to initialize them (they auto-initialize in constructors)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { authService } from './services/auth';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { syncService } from './services/sync';

// Components (we'll create these next)
import Header from './components/Header';
import HomePage from './pages/HomePage';
import UnitsPage from './pages/UnitsPage';
import UnitDetailPage from './pages/UnitDetailPage';
import CreateUnitPage from './pages/CreateUnitPage';
import CreateStepPage from './pages/CreateStepPage';
import EditStepPage from './pages/EditStepPage';
import EditUnitPage from './pages/EditUnitPage';
import SettingsPage from './pages/SettingsPage';

export function App() {
  const [isStorageReady, setIsStorageReady] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);

  useEffect(() => {
    initializeStorage();
  }, []);

  const initializeStorage = async () => {
    try {
      await storageService.initialize();
      // Auth and sync services are initialized automatically
      setIsStorageReady(true);
    } catch (error) {
      console.error('Failed to initialize storage:', error);
      setStorageError(error instanceof Error ? error.message : 'Storage initialization failed');
    }
  };

  if (storageError) {
    return (
      <div class="min-h-screen bg-gray-50 flex items-center justify-center">
        <div class="card max-w-md mx-4">
          <h1 class="text-xl font-bold text-red-600 mb-4">Storage Error</h1>
          <p class="text-gray-700 mb-4">
            Failed to initialize local storage. This app requires IndexedDB and Origin Private File System support.
          </p>
          <p class="text-sm text-gray-500">{storageError}</p>
          <button 
            class="btn-primary mt-4"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!isStorageReady) {
    return (
      <div class="min-h-screen bg-gray-50 flex items-center justify-center">
        <div class="card max-w-md mx-4 text-center">
          <div class="loading-spinner h-12 w-12 mx-auto mb-4" />
          <h1 class="text-xl font-bold text-workshop-900 mb-2">Initializing Miniature Workshop</h1>
            <p class="text-workshop-600">Setting up local storage...</p>
        </div>
      </div>
    );
  }

  return (
    <div class="min-h-screen bg-gray-50">
      <Header />
      <main class="container mx-auto px-4 py-8">
        <Router>
          <Route path="/" component={HomePage} />
          <Route path="/units" component={UnitsPage} />
          <Route path="/units/new" component={CreateUnitPage} />
          <Route path="/units/:id" component={UnitDetailPage} />
          <Route path="/units/:unitId/steps/new" component={CreateStepPage} />
          <Route path="/units/:unitId/steps/:stepId/edit" component={EditStepPage} />
          <Route path="/units/:id/edit" component={EditUnitPage} />
          <Route path="/settings" component={SettingsPage} />
        </Router>
      </main>
    </div>
  );
} 