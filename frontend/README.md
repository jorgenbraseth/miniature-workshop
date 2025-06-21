# Miniature Workshop Frontend

Frontend application for Miniature Workshop - A comprehensive tool for documenting and sharing miniature painting techniques.

Built with Preact, TypeScript, and Tailwind CSS for a fast, modern, and responsive user experience.

## Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Environment Setup

```bash
# Copy the environment example
cp .env.example .env.local

# Edit .env.local and add your Google Client ID
# Get it from: https://console.cloud.google.com/
```

Required environment variables:

- `VITE_GOOGLE_CLIENT_ID` - Your Google OAuth client ID for authentication
- `VITE_API_BASE_URL` - Backend API URL (automatically set in production)

### 3. Start Development Server

```bash
pnpm run dev
```

The app will be available at http://localhost:5173/

## Available Scripts

- `pnpm run dev` - Starts a dev server at http://localhost:5173/

- `pnpm run build` - Builds for production, emitting to `dist/`

- `pnpm run preview` - Starts a server at http://localhost:4173/ to test production build locally

## Google OAuth Setup

To enable authentication, you need to set up Google OAuth:

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API (or Google Identity API)

### 2. Create OAuth Credentials

1. Go to "Credentials" in the API & Services section
2. Click "Create Credentials" → "OAuth 2.0 Client IDs"
3. Choose "Web application"
4. Add authorized origins:
   - `http://localhost:5173` (for development)
   - `https://your-domain.vercel.app` (for production)

### 3. Configure Environment

Add your client ID to `.env.local`:

```
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

## Features

- 🎨 **Offline-first**: Works without internet, syncs when online
- 🔐 **Google OAuth**: Secure authentication
- ☁️ **Auto-sync**: Automatic data synchronization every 30 seconds
- 📱 **Responsive**: Works on desktop, tablet, and mobile
- 🚀 **Fast**: Built with Preact and optimized for performance
- 📸 **Photo storage**: Local photo storage with OPFS
- 🎯 **TypeScript**: Full type safety throughout
