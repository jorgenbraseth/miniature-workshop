import { useState, useEffect } from 'preact/hooks';
import { syncService, SyncStatus } from '../services/sync';

export default function SyncStatusComponent() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(syncService.getSyncStatus());

  useEffect(() => {
    const unsubscribe = syncService.subscribe(setSyncStatus);
    return unsubscribe;
  }, []);

  const handleForceSync = () => {
    syncService.forcSync();
  };

  const getStatusColor = () => {
    if (!syncStatus.isOnline) return 'text-gray-500';
    if (syncStatus.isSyncing) return 'text-blue-500';
    if (syncStatus.failedItems > 0) return 'text-red-500';
    if (syncStatus.pendingItems > 0) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getStatusIcon = () => {
    if (!syncStatus.isOnline) return '📴';
    if (syncStatus.isSyncing) return '🔄';
    if (syncStatus.failedItems > 0) return '⚠️';
    if (syncStatus.pendingItems > 0) return '⏳';
    return '✅';
  };

  const getStatusText = () => {
    if (!syncStatus.isOnline) return 'Offline';
    if (syncStatus.isSyncing) return 'Syncing...';
    if (syncStatus.failedItems > 0) return `${syncStatus.failedItems} failed`;
    if (syncStatus.pendingItems > 0) return `${syncStatus.pendingItems} pending`;
    return 'Synced';
  };

  return (
    <div class="flex items-center space-x-2">
      <div class={`flex items-center space-x-1 text-sm ${getStatusColor()}`}>
        <span class="text-base">{getStatusIcon()}</span>
        <span>{getStatusText()}</span>
      </div>
      
      {syncStatus.isOnline && !syncStatus.isSyncing && syncStatus.pendingItems > 0 && (
        <button
          onClick={handleForceSync}
          class="text-xs text-blue-600 hover:text-blue-800 underline"
        >
          Sync now
        </button>
      )}
      
      {syncStatus.lastSyncAt && (
        <span class="text-xs text-gray-500">
          Last: {syncStatus.lastSyncAt.toLocaleTimeString()}
        </span>
      )}
    </div>
  );
} 