import { useEffect, useState } from 'preact/hooks'
import { route } from 'preact-router'
import { storageService } from '../services/storage'
import { Unit } from '../types'

export default function EditUnitPage({ id }: { id: string }) {
  const [unit, setUnit] = useState<Unit | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    gameSystem: '',
    faction: '',
    modelCount: 1,
  })

  useEffect(() => {
    loadUnit()
  }, [id])

  const loadUnit = async () => {
    try {
      setLoading(true)
      const unitData = await storageService.getUnit(id)
      if (unitData) {
        setUnit(unitData)
        // Pre-populate form with existing unit data
        setFormData({
          name: unitData.name,
          description: unitData.description,
          gameSystem: unitData.gameSystem,
          faction: unitData.faction || '',
          modelCount: unitData.modelCount,
        })
      } else {
        setError('Unit not found')
      }
    } catch (err) {
      console.error('Failed to load unit:', err)
      setError('Failed to load unit')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: Event) => {
    e.preventDefault()

    if (!unit) return

    try {
      setSaving(true)
      setError(null)

      const updatedUnit: Unit = {
        ...unit,
        name: formData.name.trim(),
        description: formData.description.trim(),
        gameSystem: formData.gameSystem,
        faction: formData.faction.trim() || undefined,
        modelCount: formData.modelCount,
        updatedAt: new Date(),
      }

      await storageService.saveUnit(updatedUnit)

      // Navigate back to unit detail page
      route(`/units/${id}`)
    } catch (err) {
      console.error('Failed to save unit:', err)
      setError('Failed to save unit. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  if (loading) {
    return (
      <div class="flex justify-center items-center min-h-64">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-paint-600" />
      </div>
    )
  }

  if (error || !unit) {
    return (
      <div class="max-w-4xl mx-auto">
        <div class="card text-center">
          <h1 class="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p class="text-gray-600 mb-4">{error || 'Unit not found'}</p>
          <button onClick={() => route('/units')} class="btn-primary">
            Back to Units
          </button>
        </div>
      </div>
    )
  }

  return (
    <div class="max-w-2xl mx-auto">
      {/* Header */}
      <div class="mb-8">
        <button
          onClick={() => route(`/units/${id}`)}
          class="text-paint-600 hover:text-paint-800 mb-2 flex items-center"
        >
          <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to {unit.name}
        </button>
        <h1 class="text-3xl font-bold text-workshop-900 flex items-center">
          <span class="mr-3">✏️</span>
          Edit Unit
        </h1>
        <p class="text-workshop-600 mt-1">Update your unit information</p>
      </div>

      <form onSubmit={handleSubmit} class="card">
        <div class="space-y-6">
          <div>
            <label class="block text-sm font-medium text-workshop-700 mb-2">Unit Name *</label>
            <input
              type="text"
              required
              class="input-field"
              value={formData.name}
              onInput={e => handleInputChange('name', (e.target as HTMLInputElement).value)}
              placeholder="e.g., Space Marine Tactical Squad"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-workshop-700 mb-2">Description</label>
            <textarea
              class="textarea-field"
              rows={3}
              value={formData.description}
              onInput={e =>
                handleInputChange('description', (e.target as HTMLTextAreaElement).value)
              }
              placeholder="Describe this unit and your painting goals..."
            />
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-workshop-700 mb-2">Game System *</label>
              <select
                required
                class="input-field"
                value={formData.gameSystem}
                onChange={e =>
                  handleInputChange('gameSystem', (e.target as HTMLSelectElement).value)
                }
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
              <label class="block text-sm font-medium text-workshop-700 mb-2">Faction</label>
              <input
                type="text"
                class="input-field"
                value={formData.faction}
                onInput={e => handleInputChange('faction', (e.target as HTMLInputElement).value)}
                placeholder="e.g., Space Marines, Orks"
              />
            </div>
          </div>

          {/* Model count - now editable */}
          <div>
            <label class="block text-sm font-medium text-workshop-700 mb-2">Number of Models</label>
            <input
              type="number"
              min="1"
              max="50"
              class="input-field"
              value={formData.modelCount}
              onInput={e =>
                handleInputChange('modelCount', parseInt((e.target as HTMLInputElement).value, 10) || 1)
              }
            />
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div class="mt-6 p-4 border border-red-200 bg-red-50 rounded-lg">
            <p class="text-red-600">{error}</p>
          </div>
        )}

        <div class="flex gap-4 mt-8">
          <button
            type="submit"
            disabled={saving || !formData.name.trim() || !formData.gameSystem}
            class="btn-primary flex-1"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            type="button"
            onClick={() => route(`/units/${id}`)}
            class="btn-secondary"
            disabled={saving}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
