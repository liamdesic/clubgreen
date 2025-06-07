import { writable } from 'svelte/store';
import { browser } from '$app/environment';

interface ThemeState {
  accentColor: string;
  logoUrl: string;
}

function createThemeStore() {
  const initialState: ThemeState = {
    accentColor: '#4CAF50', // Default green
    logoUrl: ''
  };

  const { subscribe, set, update } = writable<ThemeState>(initialState);

  return {
    subscribe,
    
    // Initialize with organization settings
    initialize(accentColor: string = '#4CAF50', logoUrl: string = '') {
      update(state => ({ ...state, accentColor, logoUrl }));
      
      // Apply accent color to CSS variables at the document level
      if (browser) {
        document.documentElement.style.setProperty('--accent-color', accentColor);
        
        // Create gradient variables based on the accent color
        const darkAccent = this.darkenColor(accentColor, 0.3);
        document.documentElement.style.setProperty('--accent-gradient', 
          `linear-gradient(135deg, ${accentColor}, ${darkAccent})`);
        
        document.documentElement.style.setProperty('--accent-gradient-very-dark', 
          `linear-gradient(135deg, ${this.darkenColor(accentColor, 0.6)}, ${this.darkenColor(accentColor, 0.8)})`);
      }
    },
    
    // Set a new accent color
    setAccentColor(color: string) {
      update(state => ({ ...state, accentColor: color }));
      
      if (browser) {
        document.documentElement.style.setProperty('--accent-color', color);
        
        // Update gradient variables
        const darkAccent = this.darkenColor(color, 0.3);
        document.documentElement.style.setProperty('--accent-gradient', 
          `linear-gradient(135deg, ${color}, ${darkAccent})`);
        
        document.documentElement.style.setProperty('--accent-gradient-very-dark', 
          `linear-gradient(135deg, ${this.darkenColor(color, 0.6)}, ${this.darkenColor(color, 0.8)})`);
      }
    },
    
    // Set a new logo URL
    setLogoUrl(url: string) {
      update(state => ({ ...state, logoUrl: url }));
    },
    
    // Helper to darken a color by a factor
    darkenColor(color: string, factor: number = 0.3): string {
      // Convert hex to RGB
      let r = 0, g = 0, b = 0;
      
      if (color.startsWith('#')) {
        // Handle hex color
        const hex = color.substring(1);
        
        if (hex.length === 3) {
          r = parseInt(hex[0] + hex[0], 16);
          g = parseInt(hex[1] + hex[1], 16);
          b = parseInt(hex[2] + hex[2], 16);
        } else if (hex.length === 6) {
          r = parseInt(hex.substring(0, 2), 16);
          g = parseInt(hex.substring(2, 4), 16);
          b = parseInt(hex.substring(4, 6), 16);
        }
      } else if (color.startsWith('rgb')) {
        // Handle rgb/rgba color
        const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
        if (rgbMatch) {
          r = parseInt(rgbMatch[1]);
          g = parseInt(rgbMatch[2]);
          b = parseInt(rgbMatch[3]);
        }
      }
      
      // Darken the color
      r = Math.max(0, Math.floor(r * (1 - factor)));
      g = Math.max(0, Math.floor(g * (1 - factor)));
      b = Math.max(0, Math.floor(b * (1 - factor)));
      
      // Convert back to hex
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }
  };
}

// Create and export the store
export const themeStore = createThemeStore();
