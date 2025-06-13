import { useState } from 'preact/hooks';
import { route } from 'preact-router';
import { v4 as uuidv4 } from 'uuid';
import { storageService } from '../services/storage';
import { Unit } from '../types';

export default function CreateUnitPage() {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    gameSystem: '',
    faction: '',
    modelCount: 1
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setLoading(true);

    try {
      const now = new Date();
      const unit: Unit = {
        id: uuidv4(),
        name: formData.name,
        description: formData.description,
        gameSystem: formData.gameSystem,
        faction: formData.faction || undefined,
        modelCount: formData.modelCount,
        steps: [],
        isComplete: false, // New units start as incomplete
        createdAt: now,
        updatedAt: now,
        isPublic: false,
        syncStatus: 'local'
      };

      await storageService.saveUnit(unit);
      route(`/units/${unit.id}`);
    } catch (error) {
      console.error('Failed to create unit:', error);
      alert('Failed to create unit. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div class="max-w-2xl mx-auto">
      <h1 class="text-3xl font-bold text-gray-900 mb-8">Create New Unit</h1>
      
      <form onSubmit={handleSubmit} class="card">
        <div class="space-y-6">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Unit Name *
            </label>
            <input
              type="text"
              required
              class="input-field"
              value={formData.name}
              onInput={(e) => handleInputChange('name', (e.target as HTMLInputElement).value)}
              placeholder="e.g., Space Marine Tactical Squad"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              class="textarea-field"
              rows={3}
              value={formData.description}
              onInput={(e) => handleInputChange('description', (e.target as HTMLTextAreaElement).value)}
              placeholder="Describe this unit and your painting goals..."
            />
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Game System *
              </label>
              <select
                required
                class="input-field"
                value={formData.gameSystem}
                onChange={(e) => handleInputChange('gameSystem', (e.target as HTMLSelectElement).value)}
              >
                <option value="">Select a game system</option>
                <option value="Warhammer 40k">Warhammer 40k</option>
                <option value="Age of Sigmar">Age of Sigmar</option>
                <option value="Kill Team">Kill Team</option>
                <option value="Necromunda">Necromunda</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Faction
              </label>
              <input
                type="text"
                class="input-field"
                value={formData.faction}
                onInput={(e) => handleInputChange('faction', (e.target as HTMLInputElement).value)}
                placeholder="e.g., Space Marines, Orks"
              />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Number of Models
            </label>
            <input
              type="number"
              min="1"
              max="50"
              class="input-field"
              value={formData.modelCount}
              onInput={(e) => handleInputChange('modelCount', parseInt((e.target as HTMLInputElement).value) || 1)}
            />
          </div>
        </div>

        <div class="flex gap-4 mt-8">
          <button
            type="submit"
            disabled={loading}
            class="btn-primary flex-1"
          >
            {loading ? 'Creating...' : 'Create Unit'}
          </button>
          <button
            type="button"
            onClick={() => route('/units')}
            class="btn-secondary"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
} 