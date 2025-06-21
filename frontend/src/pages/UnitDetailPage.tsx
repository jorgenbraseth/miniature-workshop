import { useEffect, useState } from 'preact/hooks'
import { route } from 'preact-router'
import { storageService } from '../services/storage'
import { Unit } from '../types'

export default function UnitDetailPage({ id }: { id: string }) {
  const [unit, setUnit] = useState<Unit | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadUnit()
  }, [id])

  const loadUnit = async () => {
    try {
      setLoading(true)
      const unitData = await storageService.getUnit(id)
      if (unitData) {
        setUnit(unitData)
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

  const deleteStep = async (stepId: string) => {
    if (!unit) return

    if (confirm('Are you sure you want to delete this step? This action cannot be undone.')) {
      try {
        const updatedUnit: Unit = {
          ...unit,
          steps: unit.steps.filter(s => s.id !== stepId),
          updatedAt: new Date(),
        }

        await storageService.saveUnit(updatedUnit)
        setUnit(updatedUnit)
      } catch (err) {
        console.error('Failed to delete step:', err)
        setError('Failed to delete step. Please try again.')
      }
    }
  }

  const toggleUnitCompletion = async () => {
    if (!unit) return

    try {
      const updatedUnit: Unit = {
        ...unit,
        isComplete: !unit.isComplete,
        updatedAt: new Date(),
      }

      await storageService.saveUnit(updatedUnit)
      setUnit(updatedUnit)
    } catch (err) {
      console.error('Failed to update unit completion status:', err)
      setError('Failed to update completion status. Please try again.')
    }
  }

  const deleteUnit = async () => {
    if (!unit) return

    const confirmMessage = `Are you sure you want to delete "${unit.name}"? This will permanently remove the unit and all its steps. This action cannot be undone.`

    if (confirm(confirmMessage)) {
      try {
        await storageService.deleteUnit(unit.id)
        route('/units')
      } catch (err) {
        console.error('Failed to delete unit:', err)
        setError('Failed to delete unit. Please try again.')
      }
    }
  }

  const setThumbnail = async (photoId: string) => {
    if (!unit) return

    try {
      const updatedUnit: Unit = {
        ...unit,
        thumbnailPhotoId: photoId,
        updatedAt: new Date(),
      }

      await storageService.saveUnit(updatedUnit)
      setUnit(updatedUnit)
    } catch (err) {
      console.error('Failed to set thumbnail:', err)
      setError('Failed to set thumbnail. Please try again.')
    }
  }

  const removeThumbnail = async () => {
    if (!unit) return

    try {
      const updatedUnit: Unit = {
        ...unit,
        thumbnailPhotoId: undefined,
        updatedAt: new Date(),
      }

      await storageService.saveUnit(updatedUnit)
      setUnit(updatedUnit)
    } catch (err) {
      console.error('Failed to remove thumbnail:', err)
      setError('Failed to remove thumbnail. Please try again.')
    }
  }

  if (loading) {
    return (
      <div class="flex justify-center items-center min-h-64">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
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

  const completedSteps = unit.steps.length

  return (
    <div class="max-w-6xl mx-auto">
      {/* Header */}
      <div class="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <button
            onClick={() => route('/units')}
            class="text-blue-600 hover:text-blue-800 mb-2 flex items-center"
          >
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Units
          </button>
          <div class="flex items-center gap-4 mb-2">
            <h1 class="text-3xl font-bold text-gray-900">{unit.name}</h1>
            <button
              onClick={toggleUnitCompletion}
              class={`px-3 py-1 rounded-full text-sm font-medium transition-colors duration-200 ${
                unit.isComplete
                  ? 'bg-green-100 text-green-800 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title={unit.isComplete ? 'Mark as incomplete' : 'Mark as complete'}
            >
              {unit.isComplete ? '✅ Complete' : '⏳ In Progress'}
            </button>
          </div>
          <p class="text-gray-600">
            {unit.gameSystem}
            {unit.faction && ` • ${unit.faction}`}
          </p>
        </div>
        <div class="mt-4 md:mt-0 flex items-center space-x-3">
          <button
            onClick={() => route(`/units/${id}/edit`)}
            class="text-workshop-600 hover:text-workshop-800 p-2 rounded-lg hover:bg-workshop-50 transition-colors duration-200 flex items-center space-x-1"
            title="Edit unit"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            <span class="text-sm font-medium">Edit</span>
          </button>
          <button
            onClick={deleteUnit}
            class="text-red-600 hover:text-red-800 p-2 rounded-lg hover:bg-red-50 transition-colors duration-200 flex items-center space-x-1"
            title="Delete unit"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            <span class="text-sm font-medium">Delete</span>
          </button>
          <span
            class={`px-3 py-1 rounded-full text-sm ${
              unit.syncStatus === 'synced'
                ? 'bg-green-100 text-green-800'
                : unit.syncStatus === 'syncing'
                  ? 'bg-yellow-100 text-yellow-800'
                  : unit.syncStatus === 'conflict'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-gray-100 text-gray-800'
            }`}
          >
            {unit.syncStatus}
          </span>
        </div>
      </div>

      {/* Stats Cards */}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div class="card text-center">
          <div class="text-2xl font-bold text-blue-600 mb-1">{completedSteps}</div>
          <div class="text-gray-600">Painting Steps</div>
        </div>
        <div class="card text-center">
          <div class="text-2xl font-bold text-blue-600 mb-1">
            {unit.steps.reduce((total, step) => total + step.photos.length, 0)}
          </div>
          <div class="text-gray-600">Photos</div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Unit Info */}
        <div class="lg:col-span-1">
          <div class="card">
            <h2 class="text-xl font-semibold text-gray-900 mb-4">Unit Information</h2>

            {unit.description && (
              <div class="mb-4">
                <h3 class="font-medium text-gray-700 mb-2">Description</h3>
                <p class="text-gray-600">{unit.description}</p>
              </div>
            )}

            {/* Thumbnail Section */}
            {(() => {
              const allPhotos = unit.steps.flatMap(step => step.photos)
              const currentThumbnail = allPhotos.find(photo => photo.id === unit.thumbnailPhotoId)

              return (
                <div class="mb-4">
                  <h3 class="font-medium text-gray-700 mb-2">Unit Thumbnail</h3>
                  {currentThumbnail ? (
                    <div class="mb-3">
                      <div class="relative inline-block">
                        <img
                          src={currentThumbnail.opfsPath}
                          alt="Unit thumbnail"
                          class="w-24 h-24 object-cover rounded-lg border border-gray-200"
                        />
                        <button
                          onClick={removeThumbnail}
                          class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                          title="Remove thumbnail"
                        >
                          ×
                        </button>
                      </div>
                      <p class="text-xs text-gray-500 mt-1">Current thumbnail</p>
                    </div>
                  ) : (
                    <p class="text-gray-500 text-sm mb-3">No thumbnail selected</p>
                  )}

                  {allPhotos.length > 0 && (
                    <details class="group">
                      <summary class="cursor-pointer text-sm text-workshop-600 hover:text-workshop-800 font-medium">
                        {currentThumbnail ? 'Change thumbnail' : 'Choose thumbnail'} (
                        {allPhotos.length} photos)
                      </summary>
                      <div class="mt-2 grid grid-cols-3 gap-2 max-h-32 overflow-y-auto">
                        {allPhotos.map(photo => (
                          <button
                            key={photo.id}
                            onClick={() => setThumbnail(photo.id)}
                            class={`relative group/thumb ${
                              photo.id === unit.thumbnailPhotoId
                                ? 'ring-2 ring-workshop-500'
                                : 'hover:ring-2 hover:ring-workshop-300'
                            }`}
                            title={`Set as thumbnail: ${photo.description}`}
                          >
                            <img
                              src={photo.opfsPath}
                              alt={photo.description}
                              class="w-full h-16 object-cover rounded border"
                            />
                            {photo.id === unit.thumbnailPhotoId && (
                              <div class="absolute inset-0 bg-workshop-500 bg-opacity-20 rounded flex items-center justify-center">
                                <svg
                                  class="w-4 h-4 text-workshop-600"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fill-rule="evenodd"
                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                    clip-rule="evenodd"
                                  />
                                </svg>
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              )
            })()}

            <div class="text-sm text-gray-500">
              <p>Created: {new Date(unit.createdAt).toLocaleDateString()}</p>
              <p>Updated: {new Date(unit.updatedAt).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        {/* Painting Steps */}
        <div class="lg:col-span-2">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-semibold text-gray-900">Painting Steps</h2>
            <button onClick={() => route(`/units/${id}/steps/new`)} class="btn-primary">
              Add Step
            </button>
          </div>

          {unit.steps.length === 0 ? (
            <div class="card text-center py-12">
              <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  class="w-8 h-8 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
              </div>
              <h3 class="text-lg font-medium text-gray-900 mb-2">No Steps Yet</h3>
              <p class="text-gray-600 mb-4">Start documenting your painting process!</p>
              <button onClick={() => route(`/units/${id}/steps/new`)} class="btn-primary">
                Add Your First Step
              </button>
            </div>
          ) : (
            <div class="space-y-6">
              {unit.steps
                .sort((a, b) => a.stepNumber - b.stepNumber)
                .map(step => (
                  <div key={step.id} class="card">
                    <div class="flex items-start justify-between mb-4">
                      <div class="flex-1">
                        <h3 class="text-lg font-semibold text-gray-900">
                          Step {step.stepNumber}: {step.technique.join(', ')}
                        </h3>
                        <p class="text-gray-600 mt-1">{step.description}</p>
                      </div>
                      <div class="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => route(`/units/${id}/steps/${step.id}/edit`)}
                          class="text-workshop-600 hover:text-workshop-800 p-1 rounded hover:bg-workshop-50 transition-colors duration-200"
                          title="Edit step"
                        >
                          <svg
                            class="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => deleteStep(step.id)}
                          class="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition-colors duration-200"
                          title="Delete step"
                        >
                          <svg
                            class="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                        <span class="text-sm text-gray-500">
                          {new Date(step.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Paints used */}
                    {step.paints.length > 0 && (
                      <div class="mb-4">
                        <h4 class="font-medium text-gray-700 mb-2">Paints:</h4>
                        <div class="flex flex-wrap gap-2">
                          {step.paints.map((paint, index) => (
                            <span
                              key={index}
                              class="px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded"
                            >
                              {paint.brand} {paint.colorName}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Photos */}
                    {step.photos.length > 0 && (
                      <div class="mb-4">
                        <h4 class="font-medium text-gray-700 mb-2">
                          Photos ({step.photos.length}):
                        </h4>
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {step.photos.map(photo => (
                            <div key={photo.id} class="relative group">
                              <img
                                src={photo.opfsPath}
                                alt={photo.description}
                                class="w-full h-24 object-cover rounded-lg border border-gray-200 hover:border-workshop-400 transition-colors cursor-pointer"
                                onClick={() => {
                                  // Create a modal or lightbox view
                                  const modal = document.createElement('div')
                                  modal.className =
                                    'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50'
                                  modal.onclick = () => modal.remove()

                                  const img = document.createElement('img')
                                  img.src = photo.opfsPath
                                  img.className = 'max-w-full max-h-full object-contain'
                                  img.alt = photo.description

                                  modal.appendChild(img)
                                  document.body.appendChild(modal)
                                }}
                              />
                              {/* Thumbnail indicator and set button */}
                              {photo.id === unit.thumbnailPhotoId ? (
                                <div
                                  class="absolute top-1 right-1 bg-workshop-500 text-white rounded-full p-1"
                                  title="Unit thumbnail"
                                >
                                  <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path
                                      fill-rule="evenodd"
                                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                      clip-rule="evenodd"
                                    />
                                  </svg>
                                </div>
                              ) : (
                                <button
                                  onClick={e => {
                                    e.stopPropagation()
                                    setThumbnail(photo.id)
                                  }}
                                  class="absolute top-1 right-1 bg-black bg-opacity-50 text-white rounded-full p-1 transition-opacity hover:bg-workshop-500"
                                  title="Set as unit thumbnail"
                                >
                                  <svg
                                    class="w-3 h-3"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      stroke-linecap="round"
                                      stroke-linejoin="round"
                                      stroke-width="2"
                                      d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                                    />
                                  </svg>
                                </button>
                              )}
                              <div class="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 rounded-b-lg transition-opacity">
                                {photo.description}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
