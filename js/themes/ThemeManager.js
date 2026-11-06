/**
 * ThemeManager.js
 * Applies the single site theme ("Purple Pixel") as CSS custom properties.
 * Theme switching was removed: there is no selector, no cycling and no
 * localStorage persistence. Layout and pixel styling live in css/purple-pixel.css.
 */

import { eventBus } from '../core/EventBus.js';

const THEME = Object.freeze({
  id: 'purple-haze', // kept as id: css/purple-pixel.css is scoped to body.theme-purple-haze
  name: 'Purple Pixel',
  description: '8-bit synthwave purple',
  colors: {
    primary: '#cc66ff',
    primaryDim: '#aa44dd',
    primaryBright: '#f0c6ff',

    background: '#140a24',
    backgroundLight: '#1d1033',
    backgroundLighter: '#2a1748',

    text: '#e6d3ff',
    textDim: '#a98ad6',
    textMuted: '#8a6cba',

    accent: '#ff66cc',
    accentDim: '#cc4499',

    border: '#cc66ff',
    borderDim: '#3d2466',

    hover: '#ffd166',
    active: '#ffe399',
    focus: '#ffd166',

    success: '#66ffb3',
    warning: '#ffd166',
    error: '#ff6680',
    info: '#66ccff',

    cursor: '#cc66ff',
    selection: 'rgba(255, 102, 204, 0.35)',
    scrollbar: '#cc66ff',
    scrollbarTrack: '#1d1033',

    glow: 'rgba(204, 102, 255, 0.35)',
    glowIntensity: '0.8'
  }
});

const camelToKebab = (str) => str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

class ThemeManager {
  constructor() {
    this.currentTheme = THEME.id;
    this.initialized = false;
  }

  /**
   * Apply the theme once at startup
   */
  init() {
    if (this.initialized) return;

    const root = document.documentElement;
    Object.entries(THEME.colors).forEach(([key, value]) => {
      root.style.setProperty(`--terminal-${camelToKebab(key)}`, value);
    });

    document.body.classList.add(`theme-${THEME.id}`);

    // Drop preferences saved by older versions that had a theme switcher
    try {
      localStorage.removeItem('terminal-theme');
      localStorage.removeItem('terminal-theme-v2');
    } catch (e) { /* storage unavailable: nothing to clean */ }

    this.initialized = true;
    eventBus.emit('theme:ready', { theme: this.currentTheme });
  }

  /** @returns {Object} The site theme */
  getTheme() {
    return THEME;
  }

  /** @returns {Array} Single-item list, kept for API compatibility */
  getAllThemes() {
    return [THEME];
  }
}

// Singleton export
export const themeManager = new ThemeManager();
export default themeManager;
