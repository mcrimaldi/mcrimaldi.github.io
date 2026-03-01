/**
 * ══════════════════════════════════════════
 * 📄 FILE: js/core/Config.js
 * 🔌 MODULE TYPE: core
 * 📝 PURPOSE: Configuration loader and centralized settings management
 * ══════════════════════════════════════════
 */

import eventBus from './EventBus.js';

const DEFAULT_CONFIG = {
  // Terminal settings
  terminal: {
    prompt: 'visitor@portfolio:~$',
    typingSpeed: 30,
    bootDelay: 500,
    showBootSequence: true,
    cursorBlink: true
  },
  
  // Theme settings
  theme: {
    default: 'green-classic',
    available: ['green-classic', 'amber-vintage', 'cyan-modern'],
    persist: true
  },
  
  // Effects settings
  effects: {
    scanlines: true,
    glow: true,
    flicker: false,
    cursor: true,
    typing: true,
    crt: true
  },
  
  // Content settings
  content: {
    basePath: './content',
    defaultAdapter: 'markdown',
    cacheEnabled: true,
    cacheTTL: 300000 // 5 minutes
  },
  
  // Plugin settings
  plugins: {
    autoLoad: true,
    loadOrder: ['about', 'skills', 'projects', 'experience', 'contact']
  },
  
  // Accessibility
  accessibility: {
    reduceMotion: false,
    highContrast: false,
    screenReaderAnnouncements: true
  },
  
  // Debug
  debug: false
};

class Config {
  constructor() {
    this._config = this._deepClone(DEFAULT_CONFIG);
    this._loaded = false;
    this._watchers = new Map();
  }

  /**
   * Load configuration from external JSON file or merge from object
   * @param {string|Object} pathOrConfig - Path to config file OR config object to merge
   * @returns {Promise<void>}
   */
  async load(pathOrConfig = './config.json') {
    try {
      // If an object is passed, merge it directly
      if (typeof pathOrConfig === 'object' && pathOrConfig !== null) {
        this._config = this._deepMerge(this._config, pathOrConfig);
        eventBus.emit('config:loaded', { config: this._config });
      } else {
        // Otherwise, try to load from file path
        const response = await fetch(pathOrConfig);
        if (response.ok) {
          const externalConfig = await response.json();
          this._config = this._deepMerge(this._config, externalConfig);
          eventBus.emit('config:loaded', { config: this._config });
        }
      }
    } catch (error) {
      console.warn('[Config] External config not found, using defaults');
    }

    // Load persisted settings from localStorage
    this._loadPersistedSettings();
    
    this._loaded = true;
    eventBus.emit('config:ready', { config: this._config });
  }

  /**
   * Get a configuration value by path
   * @param {string} path - Dot-notation path (e.g., 'terminal.typingSpeed')
   * @param {any} defaultValue - Default value if not found
   * @returns {any}
   */
  get(path, defaultValue = undefined) {
    const keys = path.split('.');
    let value = this._config;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return defaultValue;
      }
    }
    
    return value;
  }

  /**
   * Set a configuration value by path
   * @param {string} path - Dot-notation path
   * @param {any} value - Value to set
   * @param {boolean} persist - Whether to persist to localStorage
   */
  set(path, value, persist = false) {
    const keys = path.split('.');
    let obj = this._config;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in obj)) {
        obj[key] = {};
      }
      obj = obj[key];
    }
    
    const lastKey = keys[keys.length - 1];
    const oldValue = obj[lastKey];
    obj[lastKey] = value;

    if (persist) {
      this._persistSetting(path, value);
    }

    // Notify watchers
    this._notifyWatchers(path, value, oldValue);
    
    eventBus.emit('config:changed', { path, value, oldValue });
  }

  /**
   * Watch for changes to a config path
   * @param {string} path - Config path to watch
   * @param {Function} callback - Called with (newValue, oldValue)
   * @returns {Function} Unwatch function
   */
  watch(path, callback) {
    if (!this._watchers.has(path)) {
      this._watchers.set(path, []);
    }
    this._watchers.get(path).push(callback);

    return () => {
      const callbacks = this._watchers.get(path);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    };
  }

  /**
   * Get all configuration
   * @returns {Object}
   */
  getAll() {
    return this._deepClone(this._config);
  }

  /**
   * Reset configuration to defaults
   */
  reset() {
    this._config = this._deepClone(DEFAULT_CONFIG);
    localStorage.removeItem('terminal-config');
    eventBus.emit('config:reset', { config: this._config });
  }

  /**
   * Check if config has been loaded
   * @returns {boolean}
   */
  isLoaded() {
    return this._loaded;
  }

  // Private methods

  _deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  _deepMerge(target, source) {
    const result = { ...target };
    
    for (const key of Object.keys(source)) {
      if (
        source[key] &&
        typeof source[key] === 'object' &&
        !Array.isArray(source[key])
      ) {
        result[key] = this._deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }

  _loadPersistedSettings() {
    try {
      const saved = localStorage.getItem('terminal-config');
      if (saved) {
        const persisted = JSON.parse(saved);
        this._config = this._deepMerge(this._config, persisted);
      }
    } catch (error) {
      console.warn('[Config] Failed to load persisted settings:', error);
    }
  }

  _persistSetting(path, value) {
    try {
      let persisted = {};
      const saved = localStorage.getItem('terminal-config');
      if (saved) {
        persisted = JSON.parse(saved);
      }

      const keys = path.split('.');
      let obj = persisted;
      for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (!(key in obj)) {
          obj[key] = {};
        }
        obj = obj[key];
      }
      obj[keys[keys.length - 1]] = value;

      localStorage.setItem('terminal-config', JSON.stringify(persisted));
    } catch (error) {
      console.warn('[Config] Failed to persist setting:', error);
    }
  }

  _notifyWatchers(path, newValue, oldValue) {
    // Notify exact path watchers
    if (this._watchers.has(path)) {
      this._watchers.get(path).forEach(cb => cb(newValue, oldValue));
    }

    // Notify parent path watchers
    const parts = path.split('.');
    for (let i = parts.length - 1; i > 0; i--) {
      const parentPath = parts.slice(0, i).join('.');
      if (this._watchers.has(parentPath)) {
        this._watchers.get(parentPath).forEach(cb => 
          cb(this.get(parentPath), undefined)
        );
      }
    }
  }
}

// Singleton instance
const config = new Config();

// Export both as default and named for flexibility
export default config;
export { config, Config, DEFAULT_CONFIG };
