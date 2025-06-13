import { useEffect, useState } from 'preact/hooks';
import { route } from 'preact-router';
import { storageService } from '../services/storage';
import { Unit, Step, Paint, Brush } from '../types';
import { v4 as uuidv4 } from 'uuid';

export default function CreateStepPage({ unitId }: { unitId: string }) {
  const [unit, setUnit] = useState<Unit | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [technique, setTechnique] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [paintsUsed, setPaintsUsed] = useState('');
  const [toolsUsed, setToolsUsed] = useState('');

  // Form inputs
  const [techniqueInput, setTechniqueInput] = useState('');

  useEffect(() => {
    loadUnit();
  }, [unitId]);

  const loadUnit = async () => {
    try {
      setLoading(true);
      const unitData = await storageService.getUnit(unitId);
      if (unitData) {
        setUnit(unitData);
      } else {
        setError('Unit not found');
      }
    } catch (err) {
      console.error('Failed to load unit:', err);
      setError('Failed to load unit');
    } finally {
      setLoading(false);
    }
  };

  const addTechnique = () => {
    if (techniqueInput.trim() && !technique.includes(techniqueInput.trim())) {
      setTechnique([...technique, techniqueInput.trim()]);
      setTechniqueInput('');
    }
  };

  const removeTechnique = (index: number) => {
    setTechnique(technique.filter((_, i) => i !== index));
  };







  const handleSubmit = async (e: any) => {
    e.preventDefault();
    
    // Collect all techniques (both added ones and current input)
    const allTechniques = [...technique];
    if (techniqueInput.trim() && !allTechniques.includes(techniqueInput.trim())) {
      allTechniques.push(techniqueInput.trim());
    }

    if (!unit || allTechniques.length === 0) {
      setError('Please enter at least one painting technique');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const newStep: Step = {
        id: uuidv4(),
        stepNumber: unit.steps.length + 1,
        technique: allTechniques,
        description: description.trim() || '', // Optional description
        timestamp: new Date(),
        paints: [], // Will be parsed from paintsUsed text later if needed
        brushes: [], // Will be parsed from toolsUsed text later if needed
        otherTools: [], // Will be parsed from toolsUsed text later if needed
        photos: [], // Photos will be added later
        appliedToModels: [] // Simplified - no longer tracking per-model application
      };

      const updatedUnit: Unit = {
        ...unit,
        steps: [...unit.steps, newStep],
        updatedAt: new Date()
      };

      await storageService.saveUnit(updatedUnit);
      
      // Navigate back to unit detail page
      route(`/units/${unitId}`);
    } catch (err) {
      console.error('Failed to save step:', err);
      setError('Failed to save step. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div class="flex justify-center items-center min-h-64">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-paint-600"></div>
      </div>
    );
  }

  if (error && !unit) {
    return (
      <div class="max-w-4xl mx-auto">
        <div class="card text-center">
          <h1 class="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p class="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => route('/units')} 
            class="btn-primary"
          >
            Back to Units
          </button>
        </div>
      </div>
    );
  }

  return (
    <div class="max-w-4xl mx-auto">
      {/* Header */}
      <div class="mb-8">
        <button 
          onClick={() => route(`/units/${unitId}`)} 
          class="text-paint-600 hover:text-paint-800 mb-2 flex items-center"
        >
          <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          Back to {unit?.name}
        </button>
        <h1 class="text-3xl font-bold text-workshop-900 flex items-center">
          <span class="mr-3">🖌️</span>
          Add New Step
        </h1>
        <p class="text-workshop-600 mt-1">Document your painting technique</p>
      </div>

      <form onSubmit={handleSubmit} class="space-y-8" action="javascript:void(0)">
        {/* Basic Information */}
        <div class="card">
          <h2 class="text-xl font-semibold text-workshop-900 mb-4 flex items-center">
            <span class="mr-2">📝</span>
            Step Information
          </h2>
          
          {/* Techniques */}
          <div class="mb-6">
            <label class="block text-sm font-medium text-workshop-700 mb-2">
              Painting Technique *
            </label>
            <div class="flex gap-2 mb-2">
              <input
                type="text"
                value={techniqueInput}
                onInput={(e) => setTechniqueInput((e.target as HTMLInputElement).value)}
                placeholder="e.g., Base coating, Layering, Drybrushing"
                class="input-field flex-1"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTechnique())}
              />
              <button
                type="button"
                onClick={addTechnique}
                class="btn-secondary"
              >
                Add More
              </button>
            </div>
            <p class="text-sm text-workshop-500 mb-2">
              Enter your main technique above. Click "Add More" to include additional techniques.
            </p>
            <div class="flex flex-wrap gap-2">
              {technique.map((tech, index) => (
                <span key={index} class="inline-flex items-center px-3 py-1 bg-paint-100 text-paint-800 rounded-full text-sm">
                  {tech}
                  <button
                    type="button"
                    onClick={() => removeTechnique(index)}
                    class="ml-2 text-paint-600 hover:text-paint-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Description */}
          <div class="mb-6">
            <label class="block text-sm font-medium text-workshop-700 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onInput={(e) => setDescription((e.target as HTMLTextAreaElement).value)}
              placeholder="Describe what you did in this step (optional)..."
              rows={4}
              class="textarea-field"
            />
          </div>
        </div>

        {/* Paints */}
        <div class="card">
          <h2 class="text-xl font-semibold text-workshop-900 mb-4 flex items-center">
            <span class="mr-2">🎨</span>
            Paints Used
          </h2>
          
          <div class="mb-6">
            <label class="block text-sm font-medium text-workshop-700 mb-2">
              Paint Colors & Brands
            </label>
            <textarea
              value={paintsUsed}
              onInput={(e) => setPaintsUsed((e.target as HTMLTextAreaElement).value)}
              placeholder="e.g., Citadel Abaddon Black, Vallejo Model Color White, Army Painter Dragon Red..."
              rows={3}
              class="textarea-field"
            />
            <p class="text-sm text-workshop-500 mt-1">
              List the paints you used for this step
            </p>
          </div>
        </div>

        {/* Tools */}
        <div class="card">
          <h2 class="text-xl font-semibold text-workshop-900 mb-4 flex items-center">
            <span class="mr-2">🔧</span>
            Tools Used
          </h2>
          
          <div class="mb-6">
            <label class="block text-sm font-medium text-workshop-700 mb-2">
              Brushes & Tools
            </label>
            <textarea
              value={toolsUsed}
              onInput={(e) => setToolsUsed((e.target as HTMLTextAreaElement).value)}
              placeholder="e.g., Round brush size 2, Flat brush size 6, Sponge, Cotton swabs..."
              rows={3}
              class="textarea-field"
            />
            <p class="text-sm text-workshop-500 mt-1">
              List the brushes and tools you used for this step
            </p>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div class="card border-red-200 bg-red-50">
            <p class="text-red-600">{error}</p>
          </div>
        )}

        {/* Submit */}
        <div class="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => route(`/units/${unitId}`)}
            class="btn-secondary"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            class="btn-primary"
            disabled={saving || (technique.length === 0 && !techniqueInput.trim())}
          >
            {saving ? 'Saving...' : 'Save Step'}
          </button>
        </div>
      </form>
    </div>
  );
} 