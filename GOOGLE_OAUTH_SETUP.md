# Google OAuth Setup Guide

## Quick Setup Instructions

### 1. Get Your Google Client ID

1. **Go to Google Cloud Console**: https://console.cloud.google.com/
2. **Create or Select Project**: Create a new project or select an existing one
3. **Enable APIs**: 
   - Go to "APIs & Services" → "Library"
   - Search for "Google+ API" or "Google Identity API"
   - Click "Enable"

### 2. Create OAuth Credentials

1. **Go to Credentials**: "APIs & Services" → "Credentials"
2. **Create OAuth Client**: Click "Create Credentials" → "OAuth 2.0 Client IDs"
3. **Configure Application**:
   - Application type: "Web application"
   - Name: "Miniature Workshop"
   
4. **Add Authorized Origins**:
   - `http://localhost:5173` (for local development)
   - `https://miniature-workshop.vercel.app` (for production)
   - `https://your-custom-domain.com` (if you have one)

5. **Copy Client ID**: Copy the generated client ID (ends with `.apps.googleusercontent.com`)

### 3. Configure Your Environment

#### For Local Development:
```bash
cd frontend
cp .env.example .env.local
# Edit .env.local and paste your client ID:
echo "VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com" >> .env.local
```

#### For Production (GitHub Secrets):
1. Go to your GitHub repository
2. Settings → Secrets and variables → Actions
3. Add a new secret:
   - Name: `GOOGLE_CLIENT_ID`
   - Value: `your-client-id.apps.googleusercontent.com`

### 4. Test Authentication

1. **Start development server**: `cd frontend && pnpm run dev`
2. **Open browser**: http://localhost:5173
3. **Click "Sign in with Google"**: Should open Google OAuth popup
4. **Sign in**: Complete the Google authentication flow
5. **Check console**: Should see successful authentication messages

## Troubleshooting

### "Google Client ID not configured"
- Make sure `VITE_GOOGLE_CLIENT_ID` is set in your `.env.local` file
- Restart the development server after adding environment variables

### "Error 400: redirect_uri_mismatch"
- Add your domain to authorized origins in Google Cloud Console
- Make sure the URL matches exactly (including http/https and port)

### "This app isn't verified"
- This is normal for development - click "Advanced" → "Go to Miniature Workshop (unsafe)"
- For production, you can verify your app with Google

## Security Notes

- Never commit your actual client ID to git (it's in `.env.local` which is gitignored)
- The client ID is safe to expose in frontend code (it's designed to be public)
- Keep your client secret secure (not needed for frontend-only OAuth)
