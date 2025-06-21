import { useEffect, useState } from 'preact/hooks'
import { route } from 'preact-router'
import { storageService } from '../services/storage'
import { authService } from '../services/auth'
import { Unit, Step } from '../types'

export default function EditStepPage({ unitId, stepId }: { unitId: string; stepId: string }) {
  const [unit, setUnit] = useState<Unit | null>(null)
  const [step, setStep] = useState<Step | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [technique, setTechnique] = useState<string[]>([])
  const [description, setDescription] = useState('')
  const [paintsUsed, setPaintsUsed] = useState('')
  const [toolsUsed, setToolsUsed] = useState('')
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [existingPhotos, setExistingPhotos] = useState<any[]>([])
  const [showCamera, setShowCamera] = useState(false)
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)

  // Form inputs
  const [techniqueInput, setTechniqueInput] = useState('')

  useEffect(() => {
    loadUnitAndStep()
  }, [unitId, stepId])

  const loadUnitAndStep = async () => {
    try {
      setLoading(true)
      const unitData = await storageService.getUnit(unitId)
      if (unitData) {
        setUnit(unitData)
        const stepData = unitData.steps.find(s => s.id === stepId)
        if (stepData) {
          setStep(stepData)
          // Pre-populate form with existing step data
          setTechnique(stepData.technique)
          setDescription(stepData.description)
          setExistingPhotos(stepData.photos)
          // For now, we'll leave paints and tools empty since they're stored as arrays
          // but displayed as text. In a real app, you might want to convert them back to text
          setPaintsUsed('')
          setToolsUsed('')
        } else {
          setError('Step not found')
        }
      } else {
        setError('Unit not found')
      }
    } catch (err) {
      console.error('Failed to load unit and step:', err)
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const addTechnique = () => {
    if (techniqueInput.trim() && !technique.includes(techniqueInput.trim())) {
      setTechnique([...technique, techniqueInput.trim()])
      setTechniqueInput('')
    }
  }

  const removeTechnique = (index: number) => {
    setTechnique(technique.filter((_, i) => i !== index))
  }

  const handleImageUpload = (e: Event) => {
    const target = e.target as HTMLInputElement
    const files = target.files

    if (files) {
      const newFiles = Array.from(files)
      const updatedImages = [...selectedImages, ...newFiles]
      setSelectedImages(updatedImages)

      // Create preview URLs for new images
      const newPreviews = newFiles.map(file => URL.createObjectURL(file))
      setImagePreviews([...imagePreviews, ...newPreviews])

      // Reset the file input so the same file can be selected again
      target.value = ''
    }
  }

  const removeNewImage = (index: number) => {
    // Revoke the object URL to free memory
    URL.revokeObjectURL(imagePreviews[index])

    setSelectedImages(selectedImages.filter((_, i) => i !== index))
    setImagePreviews(imagePreviews.filter((_, i) => i !== index))
  }

  const removeExistingPhoto = (index: number) => {
    setExistingPhotos(existingPhotos.filter((_, i) => i !== index))
  }

  const createImageDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera if available
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      })
      setCameraStream(stream)
      setShowCamera(true)
    } catch (err) {
      console.error('Error accessing camera:', err)
      setError('Unable to access camera. Please check permissions or use file upload instead.')
    }
  }

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop())
      setCameraStream(null)
    }
    setShowCamera(false)
  }

  const capturePhoto = () => {
    const video = document.getElementById('camera-video-edit') as HTMLVideoElement
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')

    if (video && context) {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      context.drawImage(video, 0, 0)

      // Convert canvas to blob and then to file
      canvas.toBlob(
        blob => {
          if (blob) {
            const timestamp = Date.now()
            const file = new File([blob], `photo-${timestamp}.jpg`, { type: 'image/jpeg' })
            const updatedImages = [...selectedImages, file]
            setSelectedImages(updatedImages)

            // Create preview URL
            const previewUrl = URL.createObjectURL(file)
            setImagePreviews([...imagePreviews, previewUrl])

            // Close camera after capture
            stopCamera()
          }
        },
        'image/jpeg',
        0.8
      )
    }
  }

  // Update video element when camera stream changes
  useEffect(() => {
    if (cameraStream && showCamera) {
      const video = document.getElementById('camera-video-edit') as HTMLVideoElement
      if (video) {
        video.srcObject = cameraStream
      }
    }
  }, [cameraStream, showCamera])

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop())
      }
    }
  }, [cameraStream])

  const handleSubmit = async (e: any) => {
    e.preventDefault()

    // Collect all techniques (both added ones and current input)
    const allTechniques = [...technique]
    if (techniqueInput.trim() && !allTechniques.includes(techniqueInput.trim())) {
      allTechniques.push(techniqueInput.trim())
    }

    if (!unit || !step || !description.trim()) {
      setError('Please enter a description for this step')
      return
    }

    try {
      setSaving(true)
      setError(null)

      // Upload new images to S3 and create Photo objects
      const newPhotos = await Promise.all(
        selectedImages.map(async (file, index) => {
          try {
            // Get upload URL from backend
            const authState = authService.getAuthState()
            if (!authState.isAuthenticated || !authState.token) {
              throw new Error('Not authenticated')
            }

            const uploadResponse = await fetch(
              `${import.meta.env.VITE_API_BASE_URL}/images/upload-url`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${authState.token}`,
                },
                body: JSON.stringify({
                  type: 'detail',
                  description: `Step ${step.stepNumber} - Image ${existingPhotos.length + index + 1}`,
                  isPublic: false,
                }),
              }
            )

            if (!uploadResponse.ok) {
              throw new Error(`Failed to get upload URL: ${uploadResponse.status}`)
            }

            const uploadData = await uploadResponse.json()
            if (!uploadData.success) {
              throw new Error(uploadData.error || 'Failed to get upload URL')
            }

            // Upload image to S3
            const s3Response = await fetch(uploadData.data.uploadUrl, {
              method: 'PUT',
              body: file,
              headers: {
                'Content-Type': 'image/jpeg',
              },
            })

            if (!s3Response.ok) {
              throw new Error(`Failed to upload image: ${s3Response.status}`)
            }

            // Store local copy in OPFS for offline access
            let localPath = ''
            try {
              await storageService.savePhoto(
                {
                  id: uploadData.data.imageId,
                  opfsPath: `images/${uploadData.data.imageId}.jpg`,
                  thumbnailPath: `thumbnails/${uploadData.data.imageId}.jpg`,
                  type: 'detail',
                  description: `Step ${step.stepNumber} - Image ${existingPhotos.length + index + 1}`,
                  timestamp: new Date(),
                },
                file
              )
              localPath = `images/${uploadData.data.imageId}.jpg`
            } catch (opfsError) {
              console.warn('Failed to save to OPFS, using S3 URL only:', opfsError)
              // Construct S3 URL as fallback
              localPath = `https://${import.meta.env.VITE_IMAGES_BUCKET}.s3.eu-west-1.amazonaws.com/${uploadData.data.s3Key}`
            }

            return {
              id: uploadData.data.imageId,
              opfsPath: localPath, // Local OPFS path or S3 URL fallback
              thumbnailPath: localPath, // Same for now
              type: 'detail' as const,
              description: `Step ${step.stepNumber} - Image ${existingPhotos.length + index + 1}`,
              timestamp: new Date(),
              s3Key: uploadData.data.s3Key, // Store S3 key for sync
            }
          } catch (uploadError) {
            console.error('Failed to upload image:', uploadError)
            // Fallback to data URL for offline use (temporary)
            const dataUrl = await createImageDataUrl(file)
            return {
              id: `temp-${Date.now()}-${index}`,
              opfsPath: dataUrl,
              thumbnailPath: dataUrl,
              type: 'detail' as const,
              description: `Step ${step.stepNumber} - Image ${existingPhotos.length + index + 1} (offline)`,
              timestamp: new Date(),
            }
          }
        })
      )

      // Combine existing photos (that weren't removed) with new photos
      const allPhotos = [...existingPhotos, ...newPhotos]

      const updatedStep: Step = {
        ...step,
        technique: allTechniques,
        description: description.trim(),
        // Keep existing data for fields we're not editing
        paints: step.paints,
        brushes: step.brushes,
        otherTools: step.otherTools,
        photos: allPhotos,
        appliedToModels: step.appliedToModels,
      }

      const updatedUnit: Unit = {
        ...unit,
        steps: unit.steps.map(s => (s.id === stepId ? updatedStep : s)),
        updatedAt: new Date(),
      }

      await storageService.saveUnit(updatedUnit)

      // Clean up object URLs
      imagePreviews.forEach(url => URL.revokeObjectURL(url))

      // Navigate back to unit detail page
      route(`/units/${unitId}`)
    } catch (err) {
      console.error('Failed to save step:', err)
      setError('Failed to save step. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div class="flex justify-center items-center min-h-64">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-paint-600" />
      </div>
    )
  }

  if (error || !unit || !step) {
    return (
      <div class="max-w-4xl mx-auto">
        <div class="card text-center">
          <h1 class="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p class="text-gray-600 mb-4">{error || 'Step not found'}</p>
          <button onClick={() => route(`/units/${unitId}`)} class="btn-primary">
            Back to Unit
          </button>
        </div>
      </div>
    )
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
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to {unit?.name}
        </button>
        <h1 class="text-3xl font-bold text-workshop-900 flex items-center">
          <span class="mr-3">✏️</span>
          Edit Step {step.stepNumber}
        </h1>
        <p class="text-workshop-600 mt-1">Update your painting technique</p>
      </div>

      <form onSubmit={handleSubmit} class="space-y-8" action="javascript:void(0)">
        {/* Photos */}
        <div class="card">
          <h2 class="text-xl font-semibold text-workshop-900 mb-4 flex items-center">
            <span class="mr-2">📸</span>
            Step Photos
          </h2>

          {/* Existing Photos */}
          {existingPhotos.length > 0 && (
            <div class="mb-6">
              <h3 class="text-sm font-medium text-workshop-700 mb-2">
                Current Photos ({existingPhotos.length})
              </h3>
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                {existingPhotos.map((photo, index) => (
                  <div key={photo.id} class="relative group">
                    <img
                      src={photo.opfsPath}
                      alt={photo.description}
                      class="w-full h-24 object-cover rounded-lg border border-workshop-200"
                    />
                    <button
                      type="button"
                      onClick={() => removeExistingPhoto(index)}
                      class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600 transition-colors"
                    >
                      ×
                    </button>
                    <div class="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 rounded-b-lg">
                      {photo.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add New Photos */}
          <div class="mb-6">
            <label class="block text-sm font-medium text-workshop-700 mb-2">Add New Images</label>

            {/* Camera Modal */}
            {showCamera && (
              <div class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
                <div class="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
                  <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold text-workshop-900">Take Photo</h3>
                    <button
                      type="button"
                      onClick={stopCamera}
                      class="text-gray-500 hover:text-gray-700"
                    >
                      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                  <div class="relative">
                    <video
                      id="camera-video-edit"
                      autoplay
                      playsinline
                      class="w-full h-64 bg-black rounded-lg object-cover"
                    />
                    <div class="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                      <button
                        type="button"
                        onClick={capturePhoto}
                        class="bg-white text-workshop-900 rounded-full p-4 shadow-lg hover:bg-gray-100 transition-colors"
                      >
                        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                          />
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Upload Options */}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Camera Capture */}
              <button
                type="button"
                onClick={startCamera}
                class="border-2 border-dashed border-workshop-300 rounded-lg p-6 text-center hover:border-workshop-400 transition-colors bg-workshop-50 hover:bg-workshop-100"
              >
                <div class="flex flex-col items-center">
                  <svg
                    class="w-12 h-12 text-workshop-500 mb-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                    />
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <p class="text-workshop-600 font-medium">Take Photo</p>
                  <p class="text-workshop-500 text-sm">Use device camera</p>
                </div>
              </button>

              {/* File Upload */}
              <div class="border-2 border-dashed border-workshop-300 rounded-lg p-6 text-center hover:border-workshop-400 transition-colors">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  class="hidden"
                  id="image-upload-edit"
                />
                <label for="image-upload-edit" class="cursor-pointer">
                  <div class="flex flex-col items-center">
                    <svg
                      class="w-12 h-12 text-workshop-400 mb-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <p class="text-workshop-600 font-medium">Upload Files</p>
                    <p class="text-workshop-500 text-sm">Choose from gallery</p>
                  </div>
                </label>
              </div>
            </div>

            {/* New Image Previews */}
            {selectedImages.length > 0 && (
              <div class="mt-4">
                <h3 class="text-sm font-medium text-workshop-700 mb-2">
                  New Images ({selectedImages.length})
                </h3>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} class="relative group">
                      <img
                        src={preview}
                        alt={`New preview ${index + 1}`}
                        class="w-full h-24 object-cover rounded-lg border border-workshop-200"
                      />
                      <button
                        type="button"
                        onClick={() => removeNewImage(index)}
                        class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600 transition-colors"
                      >
                        ×
                      </button>
                      <div class="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 rounded-b-lg">
                        {selectedImages[index].name}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p class="text-sm text-workshop-500 mt-2">
              Add photos to document this painting step. Use the camera for real-time capture,
              upload files, or remove existing photos.
            </p>
          </div>
        </div>

        {/* Step Details */}
        <div class="card">
          <h2 class="text-xl font-semibold text-workshop-900 mb-4 flex items-center">
            <span class="mr-2">📝</span>
            Step Details
          </h2>

          {/* Description */}
          <div class="mb-6">
            <label class="block text-sm font-medium text-workshop-700 mb-2">Description *</label>
            <textarea
              value={description}
              onInput={e => setDescription((e.target as HTMLTextAreaElement).value)}
              placeholder="Describe what you did in this step..."
              rows={3}
              class="textarea-field"
            />
          </div>

          {/* Paints */}
          <div class="mb-6">
            <label class="block text-sm font-medium text-workshop-700 mb-2">
              <span class="mr-1">🎨</span>
              Paint Colors & Brands
            </label>
            <textarea
              value={paintsUsed}
              onInput={e => setPaintsUsed((e.target as HTMLTextAreaElement).value)}
              placeholder="e.g., Citadel Abaddon Black, Vallejo Model Color White, Army Painter Dragon Red..."
              rows={2}
              class="textarea-field"
            />
          </div>

          {/* Tools */}
          <div class="mb-6">
            <label class="block text-sm font-medium text-workshop-700 mb-2">
              <span class="mr-1">🔧</span>
              Brushes & Tools
            </label>
            <textarea
              value={toolsUsed}
              onInput={e => setToolsUsed((e.target as HTMLTextAreaElement).value)}
              placeholder="e.g., Round brush size 2, Flat brush size 6, Sponge, Cotton swabs..."
              rows={2}
              class="textarea-field"
            />
          </div>

          {/* Techniques */}
          <div class="mb-6">
            <label class="block text-sm font-medium text-workshop-700 mb-2">
              Painting Technique
            </label>
            <div class="flex gap-2 mb-2">
              <input
                type="text"
                value={techniqueInput}
                onInput={e => setTechniqueInput((e.target as HTMLInputElement).value)}
                placeholder="e.g., Base coating, Layering, Drybrushing"
                class="input-field flex-1"
                onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addTechnique())}
              />
              <button type="button" onClick={addTechnique} class="btn-secondary">
                Add More
              </button>
            </div>
            <p class="text-sm text-workshop-500 mb-2">
              Enter your main technique above. Click "Add More" to include additional techniques
              (optional).
            </p>
            <div class="flex flex-wrap gap-2">
              {technique.map((tech, index) => (
                <span
                  key={index}
                  class="inline-flex items-center px-3 py-1 bg-paint-100 text-paint-800 rounded-full text-sm"
                >
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
          <button type="submit" class="btn-primary" disabled={saving || !description.trim()}>
            {saving ? 'Saving...' : 'Update Step'}
          </button>
        </div>
      </form>
    </div>
  )
}
