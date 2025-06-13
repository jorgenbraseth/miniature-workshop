// Core domain types for Miniature Workshop app

export interface Paint {
  id: string;
  brand: string;
  colorName: string;
  hexColor?: string;
}

export interface PaintMix {
  id: string;
  name: string;
  baseColor: Paint;
  additionalColors: Array<{
    paint: Paint;
    ratio: number;
  }>;
  water?: {
    ratio: number;
  };
  mediums?: Array<{
    name: string;
    ratio: number;
  }>;
  consistency: string;
  notes: string;
}

export interface Brush {
  id: string;
  type: string; // e.g., "Round", "Flat", "Detail"
  size: string; // e.g., "0", "2", "10/0"
  brand?: string;
}

export interface Photo {
  id: string;
  opfsPath: string; // Path to file in Origin Private File System
  thumbnailPath: string; // Path to compressed thumbnail
  type: 'detail' | 'full_model' | 'unit_overview';
  description: string;
  timestamp: Date;
}

export interface Step {
  id: string;
  stepNumber: number;
  technique: string[];
  description: string;
  timestamp: Date;
  
  // Paint information
  paints: Paint[];
  paintMix?: PaintMix;
  
  // Tools used
  brushes: Brush[];
  otherTools: string[];
  
  // Visual documentation
  photos: Photo[];
  
  // Which models this step applies to
  appliedToModels: string[]; // Model IDs
}

export interface Model {
  id: string;
  name: string;
  description?: string;
  // Track completion status
  isComplete: boolean;
  completedSteps: string[]; // Step IDs
}

export interface Unit {
  id: string;
  name: string;
  description: string;
  gameSystem: string; // e.g., "Warhammer 40k", "Age of Sigmar"
  faction?: string;
  
  // Number of models in this unit
  modelCount: number;
  
  // Painting steps for this unit
  steps: Step[];
  
  // Completion status
  isComplete: boolean;
  
  // Thumbnail image
  thumbnailPhotoId?: string; // ID of the photo to use as thumbnail
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  isPublic: boolean;
  
  // Sync status
  syncStatus: 'local' | 'syncing' | 'synced' | 'conflict';
  lastSyncAt?: Date;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: Date;
}

// Storage and sync types
export interface SyncQueueItem {
  id: string;
  type: 'unit' | 'step' | 'photo';
  action: 'create' | 'update' | 'delete';
  data: any;
  timestamp: Date;
  retryCount: number;
}

export interface StorageStats {
  totalUnits: number;
  totalSteps: number;
  totalPhotos: number;
  storageUsed: number; // in bytes
  lastBackup?: Date;
} 