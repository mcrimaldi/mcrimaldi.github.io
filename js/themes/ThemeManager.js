/**
 * ThemeManager.js
 * Manages terminal themes with CSS custom properties
 * Supports runtime switching and localStorage persistence
 */

import { eventBus } from '../core/EventBus.js';
import { config } from '../core/Config.js';

class ThemeManager {
  constructor() {
    this.themes = new Map();
    this.currentTheme = null;
    this.styleElement = null;
    this.initialized = false;
    
    // Register built-in themes
    this.registerBuiltInThemes();
  }
  
  /**
   * Initialize theme manager
   */
  init() {
    if (this.initialized) return;
    
    // Create style element for dynamic theme injection
    this.styleElement = document.createElement('style');
    this.styleElement.id = 'terminal-theme';
    document.head.appendChild(this.styleElement);
    
    // Load saved theme or default
    const savedTheme = localStorage.getItem('terminal-theme');
    const defaultTheme = config.get('theme.default', 'green-classic');
    const themeToLoad = savedTheme || defaultTheme;
    
    this.setTheme(themeToLoad);
    
    // Subscribe to events
    eventBus.on('theme:set', ({ theme }) => this.setTheme(theme));
    eventBus.on('theme:cycle', () => this.cycleTheme());
    
    this.initialized = true;
    eventBus.emit('theme:ready', { theme: this.currentTheme });
  }
  
  /**
   * Register built-in terminal themes
   */
  registerBuiltInThemes() {
    // Classic green phosphor (default)
    this.register('green-classic', {
      name: 'Green Classic',
      description: 'Classic green phosphor terminal',
      colors: {
        // Primary colors
        primary: '#00ff00',
        primaryDim: '#00cc00',
        primaryBright: '#00ff66',
        
        // Background
        background: '#0a0a0a',
        backgroundLight: '#111111',
        backgroundLighter: '#1a1a1a',
        
        // Text
        text: '#00ff00',
        textDim: '#00aa00',
        textMuted: '#006600',
        
        // Accent colors
        accent: '#33ff33',
        accentDim: '#22cc22',
        
        // UI elements
        border: '#00ff00',
        borderDim: '#004400',
        
        // Interactive states
        hover: '#00ff66',
        active: '#66ff66',
        focus: '#00ffaa',
        
        // Semantic colors
        success: '#00ff00',
        warning: '#ffff00',
        error: '#ff3333',
        info: '#00ffff',
        
        // Special
        cursor: '#00ff00',
        selection: 'rgba(0, 255, 0, 0.3)',
        scrollbar: '#00ff00',
        scrollbarTrack: '#1a1a1a',
        
        // Glow
        glow: '#00ff00',
        glowIntensity: '0.8'
      }
    });
    
    // Amber vintage
    this.register('amber-vintage', {
      name: 'Amber Vintage',
      description: 'Warm amber CRT monitor',
      colors: {
        primary: '#ffb000',
        primaryDim: '#cc8800',
        primaryBright: '#ffc433',
        
        background: '#0a0800',
        backgroundLight: '#111008',
        backgroundLighter: '#1a1810',
        
        text: '#ffb000',
        textDim: '#cc8800',
        textMuted: '#805500',
        
        accent: '#ffc433',
        accentDim: '#cc9922',
        
        border: '#ffb000',
        borderDim: '#553300',
        
        hover: '#ffc433',
        active: '#ffd666',
        focus: '#ffcc00',
        
        success: '#ffcc00',
        warning: '#ff8800',
        error: '#ff4400',
        info: '#ffdd00',
        
        cursor: '#ffb000',
        selection: 'rgba(255, 176, 0, 0.3)',
        scrollbar: '#ffb000',
        scrollbarTrack: '#1a1810',
        
        glow: '#ffb000',
        glowIntensity: '0.7'
      }
    });
    
    // Cyan modern
    this.register('cyan-modern', {
      name: 'Cyan Modern',
      description: 'Modern cyan/teal aesthetic',
      colors: {
        primary: '#00ffff',
        primaryDim: '#00cccc',
        primaryBright: '#66ffff',
        
        background: '#050a0a',
        backgroundLight: '#081111',
        backgroundLighter: '#0a1a1a',
        
        text: '#00ffff',
        textDim: '#00aaaa',
        textMuted: '#006666',
        
        accent: '#00ffcc',
        accentDim: '#00cc99',
        
        border: '#00ffff',
        borderDim: '#004444',
        
        hover: '#66ffff',
        active: '#99ffff',
        focus: '#00ffcc',
        
        success: '#00ff99',
        warning: '#ffff00',
        error: '#ff3366',
        info: '#00ccff',
        
        cursor: '#00ffff',
        selection: 'rgba(0, 255, 255, 0.3)',
        scrollbar: '#00ffff',
        scrollbarTrack: '#0a1a1a',
        
        glow: '#00ffff',
        glowIntensity: '0.75'
      }
    });
    
    // Purple haze
    this.register('purple-haze', {
      name: 'Purple Haze',
      description: 'Synthwave purple vibes',
      colors: {
        primary: '#cc66ff',
        primaryDim: '#aa44dd',
        primaryBright: '#dd99ff',
        
        background: '#0a050a',
        backgroundLight: '#110811',
        backgroundLighter: '#1a0f1a',
        
        text: '#cc66ff',
        textDim: '#9944cc',
        textMuted: '#663399',
        
        accent: '#ff66cc',
        accentDim: '#cc4499',
        
        border: '#cc66ff',
        borderDim: '#442255',
        
        hover: '#dd99ff',
        active: '#eeccff',
        focus: '#ff99dd',
        
        success: '#66ff99',
        warning: '#ffcc66',
        error: '#ff6666',
        info: '#66ccff',
        
        cursor: '#cc66ff',
        selection: 'rgba(204, 102, 255, 0.3)',
        scrollbar: '#cc66ff',
        scrollbarTrack: '#1a0f1a',
        
        glow: '#cc66ff',
        glowIntensity: '0.8'
      }
    });
    
    // Matrix rain (green variant)
    this.register('matrix', {
      name: 'Matrix',
      description: 'Digital rain aesthetic',
      colors: {
        primary: '#00ff41',
        primaryDim: '#00cc33',
        primaryBright: '#33ff66',
        
        background: '#000000',
        backgroundLight: '#0a0f0a',
        backgroundLighter: '#0f1a0f',
        
        text: '#00ff41',
        textDim: '#00aa2a',
        textMuted: '#006619',
        
        accent: '#00ff41',
        accentDim: '#00cc33',
        
        border: '#00ff41',
        borderDim: '#003311',
        
        hover: '#33ff66',
        active: '#66ff88',
        focus: '#00ff99',
        
        success: '#00ff41',
        warning: '#ccff00',
        error: '#ff0000',
        info: '#00ffff',
        
        cursor: '#00ff41',
        selection: 'rgba(0, 255, 65, 0.3)',
        scrollbar: '#00ff41',
        scrollbarTrack: '#0f1a0f',
        
        glow: '#00ff41',
        glowIntensity: '1'
      }
    });
  }
  
  /**
   * Register a new theme
   * @param {string} id - Theme identifier
   * @param {Object} theme - Theme configuration
   */
  register(id, theme) {
    if (!theme.name || !theme.colors) {
      console.error(`ThemeManager: Invalid theme configuration for "${id}"`);
      return false;
    }
    
    this.themes.set(id, {
      id,
      ...theme
    });
    
    eventBus.emit('theme:registered', { id, theme });
    return true;
  }
  
  /**
   * Set active theme
   * @param {string} id - Theme identifier
   */
  setTheme(id) {
    const theme = this.themes.get(id);
    
    if (!theme) {
      console.warn(`ThemeManager: Theme "${id}" not found, using default`);
      const defaultId = 'green-classic';
      return this.setTheme(defaultId);
    }
    
    this.currentTheme = id;
    this.applyTheme(theme);
    
    // Save preference
    localStorage.setItem('terminal-theme', id);
    
    // Update body class
    document.body.className = document.body.className
      .replace(/theme-[\w-]+/g, '')
      .trim();
    document.body.classList.add(`theme-${id}`);
    
    eventBus.emit('theme:changed', { id, theme });
  }
  
  /**
   * Apply theme CSS custom properties
   * @param {Object} theme - Theme configuration
   */
  applyTheme(theme) {
    const cssVars = this.generateCSSVariables(theme.colors);
    
    // Apply to :root via style element
    this.styleElement.textContent = `:root {\n${cssVars}\n}`;
    
    // Also apply directly to documentElement for immediate effect
    Object.entries(theme.colors).forEach(([key, value]) => {
      document.documentElement.style.setProperty(
        `--terminal-${this.camelToKebab(key)}`,
        value
      );
    });
  }
  
  /**
   * Generate CSS custom properties from colors object
   * @param {Object} colors - Theme colors
   * @returns {string} CSS variables
   */
  generateCSSVariables(colors) {
    return Object.entries(colors)
      .map(([key, value]) => `  --terminal-${this.camelToKebab(key)}: ${value};`)
      .join('\n');
  }
  
  /**
   * Convert camelCase to kebab-case
   * @param {string} str - Input string
   * @returns {string} Kebab-case string
   */
  camelToKebab(str) {
    return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  }
  
  /**
   * Get current theme
   * @returns {Object} Current theme
   */
  getTheme() {
    return this.themes.get(this.currentTheme);
  }
  
  /**
   * Get theme by ID
   * @param {string} id - Theme identifier
   * @returns {Object} Theme configuration
   */
  getThemeById(id) {
    return this.themes.get(id);
  }
  
  /**
   * Get all registered themes
   * @returns {Array} Array of theme objects
   */
  getAllThemes() {
    return Array.from(this.themes.values());
  }
  
  /**
   * Cycle to next theme
   */
  cycleTheme() {
    const themeIds = Array.from(this.themes.keys());
    const currentIndex = themeIds.indexOf(this.currentTheme);
    const nextIndex = (currentIndex + 1) % themeIds.length;
    
    this.setTheme(themeIds[nextIndex]);
  }
  
  /**
   * Get CSS for theme (for external use)
   * @param {string} id - Theme identifier
   * @returns {string} CSS string
   */
  getThemeCSS(id) {
    const theme = this.themes.get(id);
    if (!theme) return '';
    
    return this.generateCSSVariables(theme.colors);
  }
  
  /**
   * Export theme as JSON
   * @param {string} id - Theme identifier
   * @returns {string} JSON string
   */
  exportTheme(id) {
    const theme = this.themes.get(id);
    if (!theme) return null;
    
    return JSON.stringify(theme, null, 2);
  }
  
  /**
   * Import theme from JSON
   * @param {string} json - JSON string
   * @returns {boolean} Success
   */
  importTheme(json) {
    try {
      const theme = JSON.parse(json);
      if (!theme.id || !theme.name || !theme.colors) {
        throw new Error('Invalid theme format');
      }
      
      return this.register(theme.id, theme);
    } catch (err) {
      console.error('ThemeManager: Failed to import theme', err);
      return false;
    }
  }
}

// Singleton export
export const themeManager = new ThemeManager();
export default themeManager;
