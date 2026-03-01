/**
 * ══════════════════════════════════════════
 * 📄 FILE: js/core/PluginManager.js
 * 🔌 MODULE TYPE: core
 * 📝 PURPOSE: Plugin registration, lifecycle management, and dependency resolution
 * ══════════════════════════════════════════
 */

import eventBus from './EventBus.js';
import config from './Config.js';

// Plugin states
const PluginState = {
  REGISTERED: 'registered',
  INITIALIZING: 'initializing',
  READY: 'ready',
  ERROR: 'error',
  DISABLED: 'disabled'
};

class PluginManager {
  constructor() {
    this._plugins = new Map();
    this._instances = new Map();
    this._loadOrder = [];
    this._initialized = false;
  }

  /**
   * Register a plugin class
   * @param {class} PluginClass - Plugin class to register
   * @param {Object} options - Registration options
   * @returns {boolean} Success status
   */
  register(PluginClass, options = {}) {
    // Validate plugin
    if (!this._validatePlugin(PluginClass)) {
      console.error('[PluginManager] Invalid plugin:', PluginClass);
      return false;
    }

    const id = PluginClass.id;
    
    if (this._plugins.has(id)) {
      console.warn(`[PluginManager] Plugin "${id}" already registered`);
      return false;
    }

    const registration = {
      PluginClass,
      options: {
        priority: options.priority || 0,
        dependencies: options.dependencies || PluginClass.dependencies || [],
        enabled: options.enabled !== false,
        ...options
      },
      state: PluginState.REGISTERED,
      instance: null
    };

    this._plugins.set(id, registration);
    this._updateLoadOrder();

    eventBus.emit('plugin:registered', { id, PluginClass });
    
    return true;
  }

  /**
   * Unregister a plugin
   * @param {string} id - Plugin ID
   * @returns {boolean} Success status
   */
  unregister(id) {
    if (!this._plugins.has(id)) {
      return false;
    }

    const registration = this._plugins.get(id);
    
    // Destroy instance if exists
    if (registration.instance && typeof registration.instance.destroy === 'function') {
      registration.instance.destroy();
    }

    this._plugins.delete(id);
    this._instances.delete(id);
    this._updateLoadOrder();

    eventBus.emit('plugin:unregistered', { id });
    
    return true;
  }

  /**
   * Initialize all registered plugins
   * @param {Object} context - Shared context object
   * @returns {Promise<void>}
   */
  async initializeAll(context = {}) {
    if (this._initialized) {
      console.warn('[PluginManager] Already initialized');
      return;
    }

    eventBus.emit('plugins:initializing', { count: this._plugins.size });

    for (const id of this._loadOrder) {
      const registration = this._plugins.get(id);
      
      if (!registration.options.enabled) {
        registration.state = PluginState.DISABLED;
        continue;
      }

      await this._initializePlugin(id, context);
    }

    this._initialized = true;
    eventBus.emit('plugins:ready', { 
      plugins: this._loadOrder,
      instances: Array.from(this._instances.keys())
    });
  }

  /**
   * Initialize a single plugin
   * @param {string} id - Plugin ID
   * @param {Object} context - Shared context
   * @returns {Promise<Object>} Plugin instance
   */
  async _initializePlugin(id, context) {
    const registration = this._plugins.get(id);
    
    if (!registration) {
      throw new Error(`Plugin "${id}" not found`);
    }

    if (registration.instance) {
      return registration.instance;
    }

    registration.state = PluginState.INITIALIZING;

    try {
      // Initialize dependencies first
      for (const depId of registration.options.dependencies) {
        if (!this._instances.has(depId)) {
          await this._initializePlugin(depId, context);
        }
      }

      // Create instance
      const instance = new registration.PluginClass(context);
      
      // Call init if exists
      if (typeof instance.init === 'function') {
        await instance.init();
      }

      registration.instance = instance;
      registration.state = PluginState.READY;
      this._instances.set(id, instance);

      eventBus.emit('plugin:initialized', { id, instance });
      
      return instance;

    } catch (error) {
      registration.state = PluginState.ERROR;
      console.error(`[PluginManager] Failed to initialize "${id}":`, error);
      eventBus.emit('plugin:error', { id, error });
      throw error;
    }
  }

  /**
   * Get a plugin instance
   * @param {string} id - Plugin ID
   * @returns {Object|null}
   */
  get(id) {
    return this._instances.get(id) || null;
  }

  /**
   * Get all plugin instances
   * @returns {Map}
   */
  getAll() {
    return new Map(this._instances);
  }

  /**
   * Get plugins by type
   * @param {string} type - Plugin type
   * @returns {Object[]}
   */
  getByType(type) {
    const results = [];
    for (const [id, instance] of this._instances) {
      const registration = this._plugins.get(id);
      if (registration.PluginClass.type === type) {
        results.push({
          instance,
          order: registration.PluginClass.order || 0
        });
      }
    }
    // Sort by static order property
    results.sort((a, b) => a.order - b.order);
    return results.map(r => r.instance);
  }

  /**
   * Check if a plugin is registered
   * @param {string} id - Plugin ID
   * @returns {boolean}
   */
  has(id) {
    return this._plugins.has(id);
  }

  /**
   * Get plugin state
   * @param {string} id - Plugin ID
   * @returns {string|null}
   */
  getState(id) {
    const registration = this._plugins.get(id);
    return registration ? registration.state : null;
  }

  /**
   * Enable a plugin
   * @param {string} id - Plugin ID
   */
  async enable(id) {
    const registration = this._plugins.get(id);
    if (!registration) return;

    registration.options.enabled = true;
    
    if (this._initialized && !registration.instance) {
      await this._initializePlugin(id, {});
    }

    eventBus.emit('plugin:enabled', { id });
  }

  /**
   * Disable a plugin
   * @param {string} id - Plugin ID
   */
  disable(id) {
    const registration = this._plugins.get(id);
    if (!registration) return;

    registration.options.enabled = false;
    registration.state = PluginState.DISABLED;

    if (registration.instance && typeof registration.instance.disable === 'function') {
      registration.instance.disable();
    }

    eventBus.emit('plugin:disabled', { id });
  }

  /**
   * Get load order
   * @returns {string[]}
   */
  getLoadOrder() {
    return [...this._loadOrder];
  }

  /**
   * Destroy all plugins and reset
   */
  destroy() {
    for (const [id, registration] of this._plugins) {
      if (registration.instance && typeof registration.instance.destroy === 'function') {
        registration.instance.destroy();
      }
    }

    this._plugins.clear();
    this._instances.clear();
    this._loadOrder = [];
    this._initialized = false;

    eventBus.emit('plugins:destroyed');
  }

  // Private methods

  _validatePlugin(PluginClass) {
    if (typeof PluginClass !== 'function') {
      return false;
    }

    if (!PluginClass.id || typeof PluginClass.id !== 'string') {
      console.error('[PluginManager] Plugin must have static "id" property');
      return false;
    }

    return true;
  }

  _updateLoadOrder() {
    // Get configured load order
    const configOrder = config.get('plugins.loadOrder', []);
    
    // Build order respecting config and dependencies
    const ordered = [];
    const visited = new Set();
    const visiting = new Set();

    const visit = (id) => {
      if (visited.has(id)) return;
      if (visiting.has(id)) {
        throw new Error(`Circular dependency detected: ${id}`);
      }

      const registration = this._plugins.get(id);
      if (!registration) return;

      visiting.add(id);

      // Visit dependencies first
      for (const depId of registration.options.dependencies) {
        visit(depId);
      }

      visiting.delete(id);
      visited.add(id);
      ordered.push(id);
    };

    // Process plugins in config order first
    for (const id of configOrder) {
      if (this._plugins.has(id)) {
        visit(id);
      }
    }

    // Then remaining plugins by priority
    const remaining = Array.from(this._plugins.keys())
      .filter(id => !visited.has(id))
      .sort((a, b) => {
        const regA = this._plugins.get(a);
        const regB = this._plugins.get(b);
        return (regB.options.priority || 0) - (regA.options.priority || 0);
      });

    for (const id of remaining) {
      visit(id);
    }

    this._loadOrder = ordered;
  }
}

// Singleton instance
const pluginManager = new PluginManager();

// Export both as default and named for flexibility
export default pluginManager;
export { pluginManager, PluginManager, PluginState };
