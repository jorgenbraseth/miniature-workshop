import { route } from 'preact-router';

export default function Header() {
  const navigateHome = () => {
    route('/');
  };

  return (
    <header class="bg-white shadow-workshop border-b border-workshop-200 relative">
      <div class="absolute inset-0 bg-gradient-to-r from-workshop-50 to-paint-50 opacity-50"></div>
      <div class="container mx-auto px-4 relative">
        <div class="flex items-center justify-between h-16">
          {/* Logo and brand */}
          <div class="flex items-center">
            <div 
              onClick={navigateHome}
              class="flex items-center space-x-3 group cursor-pointer"
            >
              <div class="w-10 h-10 bg-gradient-to-br from-paint-500 to-paint-600 rounded-xl flex items-center justify-center shadow-paint transform group-hover:scale-105 transition-transform duration-200">
                <span class="text-white font-bold text-xl">🎨</span>
              </div>
              <div class="flex flex-col">
                <span class="text-xl font-bold text-workshop-900 group-hover:text-paint-600 transition-colors duration-200">pAInt</span>
                <span class="text-xs text-workshop-600 -mt-1">Miniature Workshop</span>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav class="hidden md:flex items-center space-x-6">
            <div 
              onClick={navigateHome}
              class="text-workshop-600 hover:text-workshop-900 font-medium transition-colors duration-200 flex items-center space-x-1 cursor-pointer"
            >
              <span>🏠</span>
              <span>Home</span>
            </div>
            <div 
              onClick={() => route('/units')}
              class="text-workshop-600 hover:text-workshop-900 font-medium transition-colors duration-200 flex items-center space-x-1 cursor-pointer"
            >
              <span>📦</span>
              <span>My Units</span>
            </div>
            <div 
              onClick={() => route('/units/new')}
              class="btn-primary flex items-center space-x-1 cursor-pointer"
            >
              <span>🖌️</span>
              <span>New Unit</span>
            </div>
          </nav>

          {/* Mobile menu button */}
          <div class="md:hidden">
            <button class="text-workshop-600 hover:text-workshop-900 p-2 rounded-lg hover:bg-workshop-100 transition-colors duration-200">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
} 