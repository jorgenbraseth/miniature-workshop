// Shared types for the backend API

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
  type: string;
  size: string;
  brand?: string;
}

export interface Photo {
  id: string;
  s3Key: string; // S3 object key
  thumbnailS3Key: string;
  type: 'detail' | 'full_model' | 'unit_overview';
  description: string;
  timestamp: string; // ISO string for DynamoDB
  userId: string;
  isPublic: boolean;
}

export interface Step {
  id: string;
  stepNumber: number;
  technique: string[];
  description: string;
  timestamp: string;
  
  // Paint information
  paints: Paint[];
  paintMix?: PaintMix;
  
  // Tools used
  brushes: Brush[];
  otherTools: string[];
  
  // Visual documentation
  photos: Photo[];
  
  // Which models this step applies to
  appliedToModels: string[];
}

export interface Model {
  id: string;
  name: string;
  description?: string;
  isComplete: boolean;
  completedSteps: string[];
}

export interface Unit {
  id: string;
  name: string;
  description: string;
  gameSystem: string;
  faction?: string;
  modelCount: number;
  steps: Step[];
  isComplete: boolean;
  thumbnailPhotoId?: string;
  createdAt: string;
  updatedAt: string;
  isPublic: boolean;
  syncStatus: 'local' | 'syncing' | 'synced' | 'conflict';
  lastSyncAt?: string;
  userId: string; // Added for backend
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SyncQueueItem {
  id: string;
  userId: string;
  type: 'unit' | 'step' | 'photo';
  action: 'create' | 'update' | 'delete';
  data: any;
  timestamp: string;
  retryCount: number;
  ttl: number; // TTL for DynamoDB
}

// API Request/Response Types
export interface CreateUnitRequest {
  name: string;
  description: string;
  gameSystem: string;
  faction?: string;
  modelCount: number;
  isPublic: boolean;
}

export interface UpdateUnitRequest {
  name?: string;
  description?: string;
  gameSystem?: string;
  faction?: string;
  modelCount?: number;
  isComplete?: boolean;
  thumbnailPhotoId?: string;
  isPublic?: boolean;
}

export interface CreateStepRequest {
  stepNumber: number;
  technique: string[];
  description: string;
  paints: Paint[];
  paintMix?: PaintMix;
  brushes: Brush[];
  otherTools: string[];
  appliedToModels: string[];
}

export interface UpdateStepRequest {
  stepNumber?: number;
  technique?: string[];
  description?: string;
  paints?: Paint[];
  paintMix?: PaintMix;
  brushes?: Brush[];
  otherTools?: string[];
  appliedToModels?: string[];
}

export interface UploadImageRequest {
  type: 'detail' | 'full_model' | 'unit_overview';
  description: string;
  isPublic: boolean;
}

export interface UploadImageResponse {
  uploadUrl: string;
  imageId: string;
  s3Key: string;
}

export interface SyncDataRequest {
  items: SyncQueueItem[];
}

export interface SyncDataResponse {
  processed: number;
  failed: Array<{
    item: SyncQueueItem;
    error: string;
  }>;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  nextToken?: string;
  hasMore: boolean;
  total?: number;
}

// Authentication types
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

export interface GoogleTokenPayload {
  iss: string;
  sub: string;
  aud: string;
  exp: number;
  iat: number;
  email: string;
  email_verified: boolean;
  name: string;
  picture?: string;
}

// Database item types (for DynamoDB)
export interface UnitDynamoItem extends Omit<Unit, 'createdAt' | 'updatedAt' | 'lastSyncAt' | 'isPublic'> {
  createdAt: string;
  updatedAt: string;
  lastSyncAt?: string;
  isPublic: string; // Converted to string for PublicIndex
  GSI1PK: string; // userId for UserIndex
  GSI1SK: string; // createdAt for UserIndex
}

export interface UserDynamoItem extends Omit<User, 'createdAt' | 'updatedAt'> {
  createdAt: string;
  updatedAt: string;
  GSI1PK: string; // email for EmailIndex
} 