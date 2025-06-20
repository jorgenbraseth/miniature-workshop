import { useEffect, useState } from 'preact/hooks';
import { route } from 'preact-router';
import { storageService } from '../services/storage';
import { Unit } from '../types';

export default function UnitsPage() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUnits();
  }, []);

  const loadUnits = async () => {
    try {
      const allUnits = await storageService.getAllUnits();
      setUnits(allUnits.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()));
    } catch (error) {
      console.error('Failed to load units:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div class="flex justify-center items-center min-h-64">
        <div class="loading-spinner h-8 w-8" />
      </div>
    );
  }

  if (units.length === 0) {
    return (
      <div class="text-center py-12">
        <div class="w-24 h-24 bg-workshop-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span class="text-4xl">📦</span>
        </div>
        <h2 class="text-2xl font-bold text-workshop-900 mb-2">No Units Yet</h2>
        <p class="text-workshop-600 mb-6">Start documenting your miniature painting journey!</p>
        <button 
          onClick={() => route('/units/new')} 
          class="btn-primary flex items-center space-x-2 mx-auto"
        >
          <span>🖌️</span>
          <span>Create Your First Unit</span>
        </button>
      </div>
    );
  }

  return (
    <div>
      <div class="flex justify-between items-center mb-8">
        <div>
          <h1 class="text-3xl font-bold text-workshop-900">My Units</h1>
          <p class="text-workshop-600 mt-1">Manage your miniature painting projects</p>
        </div>
        <button 
          onClick={() => route('/units/new')} 
          class="btn-primary flex items-center space-x-2"
        >
          <span>🖌️</span>
          <span>New Unit</span>
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {units.map((unit) => {
          // Find thumbnail photo
          const allPhotos = unit.steps.flatMap(step => step.photos);
          const thumbnailPhoto = allPhotos.find(photo => photo.id === unit.thumbnailPhotoId);
          
          return (
            <div 
              key={unit.id} 
              onClick={() => route(`/units/${unit.id}`)}
              class="card hover:shadow-paint transition-all duration-300 cursor-pointer group hover:-translate-y-1 overflow-hidden"
            >
              {/* Thumbnail Image */}
              {thumbnailPhoto ? (
                <div class="relative h-48 mb-4 -mx-6 -mt-6">
                  <img
                    src={thumbnailPhoto.opfsPath}
                    alt={`${unit.name} thumbnail`}
                    class="w-full h-full object-cover"
                  />
                  <div class="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                  <div class="absolute top-3 right-3 flex items-center gap-2">
                    <span class={`px-2 py-1 text-xs rounded-full font-medium backdrop-blur-sm ${
                      unit.isComplete 
                        ? 'bg-green-100/90 text-green-800' 
                        : 'bg-gray-100/90 text-gray-600'
                    }`}>
                      {unit.isComplete ? '✅' : '⏳'}
                    </span>
                    <span class={`px-2 py-1 text-xs rounded-full backdrop-blur-sm ${
                      unit.syncStatus === 'synced' ? 'bg-success-100/90 text-success-800' :
                      unit.syncStatus === 'syncing' ? 'bg-warning-100/90 text-warning-800' :
                      unit.syncStatus === 'conflict' ? 'bg-error-100/90 text-error-800' :
                      'bg-workshop-100/90 text-workshop-800'
                    }`}>
                      {unit.syncStatus}
                    </span>
                  </div>
                </div>
              ) : (
                <div class="flex justify-between items-start mb-3">
                  <div class="flex items-center gap-2 flex-1 min-w-0">
                    <span class={`px-2 py-1 text-xs rounded-full font-medium ${
                      unit.isComplete 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {unit.isComplete ? '✅' : '⏳'}
                    </span>
                  </div>
                  <span class={`px-2 py-1 text-xs rounded-full ${
                    unit.syncStatus === 'synced' ? 'bg-success-100 text-success-800' :
                    unit.syncStatus === 'syncing' ? 'bg-warning-100 text-warning-800' :
                    unit.syncStatus === 'conflict' ? 'bg-error-100 text-error-800' :
                    'bg-workshop-100 text-workshop-800'
                  }`}>
                    {unit.syncStatus}
                  </span>
                </div>
              )}
              
              {/* Unit Title */}
              <h3 class="text-lg font-semibold text-workshop-900 truncate group-hover:text-paint-600 transition-colors mb-2">
                {unit.name}
              </h3>
              
              <p class="text-workshop-600 text-sm mb-3 line-clamp-2">{unit.description}</p>
            
            <div class="flex justify-between items-center text-sm text-workshop-500 mb-3">
              <span class="flex items-center space-x-1">
                <span>🎮</span>
                <span>{unit.gameSystem}</span>
              </span>
              <span class="flex items-center space-x-1">
                <span>🎭</span>
                <span>{unit.modelCount} models</span>
              </span>
            </div>
            
            <div class="flex justify-between items-center text-sm border-t border-workshop-200 pt-3">
              <span class="text-workshop-500 flex items-center space-x-1">
                <span>🎨</span>
                <span>{unit.steps.length} steps</span>
              </span>
              <span class="text-workshop-500">
                {new Date(unit.updatedAt).toLocaleDateString()}
              </span>
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
} 