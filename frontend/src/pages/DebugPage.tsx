import { useState, useEffect } from 'preact/hooks'

export default function DebugPage() {
  const [apiStatus, setApiStatus] = useState<string>('Testing...')

  const apiUrl = import.meta.env.VITE_API_BASE_URL
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

  useEffect(() => {
    if (apiUrl) {
      fetch(`${apiUrl}/auth/user`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })
        .then(response => {
          if (response.status === 401) {
            setApiStatus('✅ API is reachable (401 Unauthorized - expected)')
          } else {
            setApiStatus(`⚠️ API responded with status ${response.status}`)
          }
        })
        .catch(error => {
          setApiStatus(`❌ API connection failed: ${error.message}`)
        })
    } else {
      setApiStatus('❌ API URL not configured')
    }
  }, [apiUrl])

  const getStatusClass = (isGood: boolean) =>
    isGood ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'

  return (
    <div class="max-w-4xl mx-auto">
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 mb-4">🔍 Debug Information</h1>
        <p class="text-gray-600">
          This page shows the current environment configuration and helps diagnose issues.
        </p>
      </div>

      {/* Environment Variables */}
      <div class="card mb-6">
        <h2 class="text-xl font-semibold text-workshop-900 mb-4">Environment Variables</h2>
        <div class="space-y-3">
          <div class="flex items-center justify-between p-3 bg-gray-50 rounded">
            <span class="font-medium">VITE_API_BASE_URL:</span>
            <span class={`px-3 py-1 rounded text-sm font-medium ${getStatusClass(!!apiUrl)}`}>
              {apiUrl || 'Not set'}
            </span>
          </div>
          <div class="flex items-center justify-between p-3 bg-gray-50 rounded">
            <span class="font-medium">VITE_GOOGLE_CLIENT_ID:</span>
            <span
              class={`px-3 py-1 rounded text-sm font-medium ${getStatusClass(!!googleClientId)}`}
            >
              {googleClientId ? `✅ Set (${googleClientId.substring(0, 20)}...)` : '❌ Not set'}
            </span>
          </div>
        </div>
      </div>

      {/* Google OAuth Status */}
      <div class="card mb-6">
        <h2 class="text-xl font-semibold text-workshop-900 mb-4">Google OAuth Configuration</h2>
        {googleClientId ? (
          <div class="space-y-3">
            <div class="p-4 bg-green-50 border border-green-200 rounded">
              <h3 class="font-medium text-green-800 mb-2">✅ Google Client ID is configured</h3>
              <p class="text-sm text-green-700">
                <strong>Client ID:</strong>{' '}
                <code class="bg-green-100 px-2 py-1 rounded">{googleClientId}</code>
              </p>
              <p class="text-sm text-green-700 mt-2">
                This should end with <code>.apps.googleusercontent.com</code>
              </p>
            </div>
          </div>
        ) : (
          <div class="p-4 bg-red-50 border border-red-200 rounded">
            <h3 class="font-medium text-red-800 mb-2">❌ Google Client ID is missing</h3>
            <p class="text-sm text-red-700 mb-2">
              The environment variable <code>VITE_GOOGLE_CLIENT_ID</code> is not set.
            </p>
            <p class="text-sm text-red-700">
              This will cause "Google Client ID not configured" errors in the console.
            </p>
          </div>
        )}
      </div>

      {/* API Connection */}
      <div class="card mb-6">
        <h2 class="text-xl font-semibold text-workshop-900 mb-4">API Connection</h2>
        <div class="space-y-3">
          <div class="p-3 bg-gray-50 rounded">
            <p class="font-medium">
              API URL:{' '}
              <code class="bg-gray-200 px-2 py-1 rounded">{apiUrl || 'Not configured'}</code>
            </p>
            <p class="text-sm text-gray-600 mt-1">Status: {apiStatus}</p>
          </div>
        </div>
      </div>

      {/* Build Information */}
      <div class="card mb-6">
        <h2 class="text-xl font-semibold text-workshop-900 mb-4">Build Information</h2>
        <div class="space-y-2 text-sm">
          <p>
            <strong>Current Time:</strong> {new Date().toISOString()}
          </p>
          <p>
            <strong>User Agent:</strong> {navigator.userAgent}
          </p>
          <p>
            <strong>Location:</strong> {window.location.href}
          </p>
          <p>
            <strong>Referrer:</strong> {document.referrer || 'Direct access'}
          </p>
        </div>
      </div>

      {/* Troubleshooting */}
      <div class="card">
        <h2 class="text-xl font-semibold text-workshop-900 mb-4">Troubleshooting</h2>
        <div class="space-y-4 text-sm">
          {!googleClientId && (
            <div class="p-3 bg-yellow-50 border border-yellow-200 rounded">
              <h3 class="font-medium text-yellow-800">🔧 To fix Google Client ID issue:</h3>
              <ol class="list-decimal list-inside mt-2 space-y-1 text-yellow-700">
                <li>
                  Check if <code>GOOGLE_CLIENT_ID</code> secret is set in GitHub repository settings
                </li>
                <li>Verify the GitHub Actions workflow is passing the environment variable</li>
                <li>Check Vercel project settings for environment variables</li>
                <li>Ensure the build process includes the environment variable</li>
              </ol>
            </div>
          )}

          {!apiUrl && (
            <div class="p-3 bg-yellow-50 border border-yellow-200 rounded">
              <h3 class="font-medium text-yellow-800">🔧 To fix API URL issue:</h3>
              <ol class="list-decimal list-inside mt-2 space-y-1 text-yellow-700">
                <li>Check if the backend is deployed and accessible</li>
                <li>Verify the GitHub Actions workflow is extracting the API URL correctly</li>
                <li>Check AWS CloudFormation outputs for the HttpApiUrl</li>
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
