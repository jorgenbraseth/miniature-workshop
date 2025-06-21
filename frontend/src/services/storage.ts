// Storage service for Miniature Workshop - handles IndexedDB and OPFS operations

import { Unit, Photo, SyncQueueItem, StorageStats } from '../types';

const DB_NAME = 'MiniatureWorkshopDB';
const DB_VERSION = 1;

// IndexedDB store names
const STORES = {
  UNITS: 'units',
  STEPS: 'steps', 
  PHOTOS: 'photos',
  SYNC_QUEUE: 'syncQueue',
  METADATA: 'metadata'
} as const;

class StorageService {
  private db: IDBDatabase | null = null;
  private opfsRoot: FileSystemDirectoryHandle | null = null;

  async initialize(): Promise<void> {
    await Promise.all([
      this.initIndexedDB(),
      this.initOPFS()
    ]);
  }

  private async initIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Units store
        if (!db.objectStoreNames.contains(STORES.UNITS)) {
          const unitStore = db.createObjectStore(STORES.UNITS, { keyPath: 'id' });
          unitStore.createIndex('gameSystem', 'gameSystem', { unique: false });
          unitStore.createIndex('createdAt', 'createdAt', { unique: false });
          unitStore.createIndex('syncStatus', 'syncStatus', { unique: false });
        }

        // Steps store
        if (!db.objectStoreNames.contains(STORES.STEPS)) {
          const stepStore = db.createObjectStore(STORES.STEPS, { keyPath: 'id' });
          stepStore.createIndex('unitId', 'unitId', { unique: false });
          stepStore.createIndex('stepNumber', 'stepNumber', { unique: false });
        }

        // Photos store
        if (!db.objectStoreNames.contains(STORES.PHOTOS)) {
          const photoStore = db.createObjectStore(STORES.PHOTOS, { keyPath: 'id' });
          photoStore.createIndex('stepId', 'stepId', { unique: false });
          photoStore.createIndex('type', 'type', { unique: false });
        }

        // Sync queue store
        if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
          const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id' });
          syncStore.createIndex('type', 'type', { unique: false });
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Metadata store
        if (!db.objectStoreNames.contains(STORES.METADATA)) {
          db.createObjectStore(STORES.METADATA, { keyPath: 'key' });
        }
      };
    });
  }

  private async initOPFS(): Promise<void> {
    if ('storage' in navigator && 'getDirectory' in navigator.storage) {
      this.opfsRoot = await navigator.storage.getDirectory();
      
      // Create directories for different image types
      await this.opfsRoot.getDirectoryHandle('images', { create: true });
      await this.opfsRoot.getDirectoryHandle('thumbnails', { create: true });
    } else {
      console.warn('Origin Private File System not supported');
    }
  }

  // Unit operations
  async saveUnit(unit: Unit): Promise<void> {
    await this.saveUnitToStorage(unit);

    // Add to sync queue
    await this.addToSyncQueue({
      id: `unit-${unit.id}-${Date.now()}`,
      type: 'unit',
      action: 'create',
      data: unit,
      timestamp: new Date(),
      retryCount: 0
    });
  }

  async saveUnitToStorage(unit: Unit): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction([STORES.UNITS], 'readwrite');
    const store = transaction.objectStore(STORES.UNITS);
    
    await new Promise<void>((resolve, reject) => {
      const request = store.put(unit);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async updateUnitSyncStatus(unitId: string, syncStatus: Unit['syncStatus']): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const unit = await this.getUnit(unitId);
    if (!unit) return;

    await this.saveUnitToStorage({
      ...unit,
      syncStatus
    });
  }

  async getAllUnits(): Promise<Unit[]> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction([STORES.UNITS], 'readonly');
    const store = transaction.objectStore(STORES.UNITS);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const units = request.result.map(this.migrateUnit);
        resolve(units);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getUnit(id: string): Promise<Unit | null> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction([STORES.UNITS], 'readonly');
    const store = transaction.objectStore(STORES.UNITS);

    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => {
        const unit = request.result;
        resolve(unit ? this.migrateUnit(unit) : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteUnit(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction([STORES.UNITS], 'readwrite');
    const store = transaction.objectStore(STORES.UNITS);

    await new Promise<void>((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    // Add to sync queue
    await this.addToSyncQueue({
      id: `unit-delete-${id}-${Date.now()}`,
      type: 'unit',
      action: 'delete',
      data: { id },
      timestamp: new Date(),
      retryCount: 0
    });
  }

  // Migration helper to ensure all units have the required fields
  private migrateUnit(unit: any): Unit {
    return {
      ...unit,
      isComplete: unit.isComplete ?? false, // Default to false if not present
      modelCount: unit.modelCount ?? (unit.models ? unit.models.length : 1), // Migrate from models array or default to 1
      thumbnailPhotoId: unit.thumbnailPhotoId ?? undefined, // Ensure thumbnailPhotoId field exists
      // Ensure dates are always Date objects, not strings
      createdAt: unit.createdAt instanceof Date ? unit.createdAt : new Date(unit.createdAt),
      updatedAt: unit.updatedAt instanceof Date ? unit.updatedAt : new Date(unit.updatedAt)
    };
  }

  // Photo operations with OPFS
  async savePhoto(photo: Photo, imageBlob: Blob): Promise<void> {
    if (!this.opfsRoot) throw new Error('OPFS not available');

    // Save original image to OPFS
    const imagesDir = await this.opfsRoot.getDirectoryHandle('images');
    const imageFile = await imagesDir.getFileHandle(`${photo.id}.jpg`, { create: true });
    const imageWritable = await imageFile.createWritable();
    await imageWritable.write(imageBlob);
    await imageWritable.close();

    // Create and save thumbnail
    const thumbnail = await this.createThumbnail(imageBlob);
    const thumbnailsDir = await this.opfsRoot.getDirectoryHandle('thumbnails');
    const thumbnailFile = await thumbnailsDir.getFileHandle(`${photo.id}.jpg`, { create: true });
    const thumbnailWritable = await thumbnailFile.createWritable();
    await thumbnailWritable.write(thumbnail);
    await thumbnailWritable.close();

    // Save photo metadata to IndexedDB
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction([STORES.PHOTOS], 'readwrite');
    const store = transaction.objectStore(STORES.PHOTOS);

    await new Promise<void>((resolve, reject) => {
      const request = store.put(photo);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getPhoto(id: string): Promise<{ photo: Photo; imageBlob: Blob } | null> {
    if (!this.db || !this.opfsRoot) return null;

    // Get photo metadata
    const transaction = this.db.transaction([STORES.PHOTOS], 'readonly');
    const store = transaction.objectStore(STORES.PHOTOS);

    const photo = await new Promise<Photo | null>((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });

    if (!photo) return null;

    // Get image from OPFS
    try {
      const imagesDir = await this.opfsRoot.getDirectoryHandle('images');
      const imageFile = await imagesDir.getFileHandle(`${id}.jpg`);
      const file = await imageFile.getFile();
      
      return { photo, imageBlob: file };
    } catch (error) {
      console.error('Failed to load image from OPFS:', error);
      return null;
    }
  }

  async getPhotoThumbnail(id: string): Promise<Blob | null> {
    if (!this.opfsRoot) return null;

    try {
      const thumbnailsDir = await this.opfsRoot.getDirectoryHandle('thumbnails');
      const thumbnailFile = await thumbnailsDir.getFileHandle(`${id}.jpg`);
      return await thumbnailFile.getFile();
    } catch (error) {
      console.error('Failed to load thumbnail from OPFS:', error);
      return null;
    }
  }

  private async createThumbnail(imageBlob: Blob, maxSize = 200): Promise<Blob> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();

      img.onload = () => {
        // Calculate thumbnail dimensions
        const { width, height } = img;
        const aspectRatio = width / height;
        
        let thumbnailWidth = maxSize;
        let thumbnailHeight = maxSize;
        
        if (aspectRatio > 1) {
          thumbnailHeight = maxSize / aspectRatio;
        } else {
          thumbnailWidth = maxSize * aspectRatio;
        }

        canvas.width = thumbnailWidth;
        canvas.height = thumbnailHeight;

        // Draw and compress
        ctx.drawImage(img, 0, 0, thumbnailWidth, thumbnailHeight);
        canvas.toBlob((blob) => {
          resolve(blob!);
        }, 'image/jpeg', 0.8);
      };

      img.src = URL.createObjectURL(imageBlob);
    });
  }

  // Sync queue operations
  private async addToSyncQueue(item: SyncQueueItem): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction([STORES.SYNC_QUEUE], 'readwrite');
    const store = transaction.objectStore(STORES.SYNC_QUEUE);

    await new Promise<void>((resolve, reject) => {
      const request = store.put(item);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getSyncQueue(): Promise<SyncQueueItem[]> {
    if (!this.db) return [];

    const transaction = this.db.transaction([STORES.SYNC_QUEUE], 'readonly');
    const store = transaction.objectStore(STORES.SYNC_QUEUE);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async updateSyncQueueItem(item: SyncQueueItem): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction([STORES.SYNC_QUEUE], 'readwrite');
    const store = transaction.objectStore(STORES.SYNC_QUEUE);

    await new Promise<void>((resolve, reject) => {
      const request = store.put(item);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async removeSyncQueueItem(itemId: string): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction([STORES.SYNC_QUEUE], 'readwrite');
    const store = transaction.objectStore(STORES.SYNC_QUEUE);

    await new Promise<void>((resolve, reject) => {
      const request = store.delete(itemId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getStorageStats(): Promise<StorageStats> {
    if (!this.db) {
      return {
        totalUnits: 0,
        totalSteps: 0,
        totalPhotos: 0,
        storageUsed: 0
      };
    }

    const [units, photos] = await Promise.all([
      this.getAllUnits(),
      this.getAllPhotos()
    ]);

    const totalSteps = units.reduce((sum, unit) => sum + unit.steps.length, 0);
    
    // Estimate storage usage (this is approximate)
    let storageUsed = 0;
    if (this.opfsRoot && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      storageUsed = estimate.usage || 0;
    }

    return {
      totalUnits: units.length,
      totalSteps,
      totalPhotos: photos.length,
      storageUsed
    };
  }

  private async getAllPhotos(): Promise<Photo[]> {
    if (!this.db) return [];

    const transaction = this.db.transaction([STORES.PHOTOS], 'readonly');
    const store = transaction.objectStore(STORES.PHOTOS);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

// Export singleton instance
export const storageService = new StorageService(); 