import { useState, useEffect } from 'preact/hooks';
import { authService, AuthState } from '../services/auth';
import { syncService, SyncStatus } from '../services/sync';
import { storageService } from '../services/storage';
import AuthGuard from '../components/AuthGuard';
import LoginButton from '../components/LoginButton';
import SyncStatusComponent from '../components/SyncStatus';

export default function SettingsPage() {
  const [authState, setAuthState] = useState<AuthState>(authService.getAuthState());
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(syncService.getSyncStatus());
  const [storageStats, setStorageStats] = useState<any>(null);

  useEffect(() => {
    const authUnsubscribe = authService.subscribe(setAuthState);
    const syncUnsubscribe = syncService.subscribe(setSyncStatus);
    
    loadStorageStats();

    return () => {
      authUnsubscribe();
      syncUnsubscribe();
    };
  }, []);

  const loadStorageStats = async () => {
    try {
      const stats = await storageService.getStorageStats();
      setStorageStats(stats);
    } catch (error) {
      console.error('Failed to load storage stats:', error);
    }
  };

  const handleForceSync = () => {
    syncService.forcSync();
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div class="max-w-2xl mx-auto">
      <h1 class="text-3xl font-bold text-gray-900 mb-8">Settings</h1>
      
      {/* Authentication Section */}
      <div class="card mb-6">
        <h2 class="text-xl font-semibold text-workshop-900 mb-4">Account & Authentication</h2>
        
        {authState.isAuthenticated && authState.user ? (
          <div class="space-y-4">
            <div class="flex items-center space-x-3">
              {authState.user.avatar && (
                <img 
                  src={authState.user.avatar} 
                  alt={authState.user.name}
                  class="w-12 h-12 rounded-full"
                />
              )}
              <div>
                <p class="font-medium text-workshop-900">{authState.user.name}</p>
                <p class="text-sm text-workshop-600">{authState.user.email}</p>
              </div>
            </div>
            <div class="pt-4 border-t border-workshop-200">
              <LoginButton />
            </div>
          </div>
        ) : (
          <div class="text-center py-4">
            <p class="text-workshop-600 mb-4">Sign in to sync your data across devices</p>
            <LoginButton />
          </div>
        )}
      </div>

      {/* Sync Section */}
      <div class="card mb-6">
        <h2 class="text-xl font-semibold text-workshop-900 mb-4">Data Sync</h2>
        
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <span class="text-workshop-700">Status:</span>
            <SyncStatusComponent />
          </div>
          
          {authState.isAuthenticated && (
            <div class="flex items-center justify-between">
              <span class="text-workshop-700">Manual Sync:</span>
              <button
                onClick={handleForceSync}
                disabled={syncStatus.isSyncing || !syncStatus.isOnline}
                class="btn-secondary text-sm"
              >
                {syncStatus.isSyncing ? 'Syncing...' : 'Sync Now'}
              </button>
            </div>
          )}
          
          <div class="text-sm text-workshop-600 space-y-1">
            <p>• Data syncs automatically every 30 seconds when online and signed in</p>
            <p>• Your data is stored locally and works offline</p>
            <p>• Sign in to backup and sync across devices</p>
          </div>
        </div>
      </div>

      {/* Storage Section */}
      <div class="card mb-6">
        <h2 class="text-xl font-semibold text-workshop-900 mb-4">Local Storage</h2>
        
        {storageStats ? (
          <div class="space-y-3">
            <div class="grid grid-cols-2 gap-4">
              <div class="text-center p-3 bg-workshop-50 rounded-lg">
                <div class="text-2xl font-bold text-paint-600">{storageStats.totalUnits}</div>
                <div class="text-sm text-workshop-600">Units</div>
              </div>
              <div class="text-center p-3 bg-workshop-50 rounded-lg">
                <div class="text-2xl font-bold text-paint-600">{storageStats.totalSteps}</div>
                <div class="text-sm text-workshop-600">Steps</div>
              </div>
              <div class="text-center p-3 bg-workshop-50 rounded-lg">
                <div class="text-2xl font-bold text-paint-600">{storageStats.totalPhotos}</div>
                <div class="text-sm text-workshop-600">Photos</div>
              </div>
              <div class="text-center p-3 bg-workshop-50 rounded-lg">
                <div class="text-2xl font-bold text-paint-600">
                  {formatBytes(storageStats.storageUsed)}
                </div>
                <div class="text-sm text-workshop-600">Storage Used</div>
              </div>
            </div>
            
            <button
              onClick={loadStorageStats}
              class="btn-secondary text-sm w-full"
            >
              Refresh Stats
            </button>
          </div>
        ) : (
          <div class="text-center py-4">
            <div class="loading-spinner h-6 w-6 mx-auto mb-2"></div>
            <p class="text-workshop-600">Loading storage stats...</p>
          </div>
        )}
      </div>

      {/* App Info */}
      <div class="card">
        <h2 class="text-xl font-semibold text-workshop-900 mb-4">About</h2>
        <div class="text-sm text-workshop-600 space-y-2">
          <p><strong>Miniature Workshop</strong> - Document your painting journey</p>
          <p>Store your miniature painting progress with photos and notes</p>
          <p>Works offline, syncs when online</p>
        </div>
      </div>
    </div>
  );
} 