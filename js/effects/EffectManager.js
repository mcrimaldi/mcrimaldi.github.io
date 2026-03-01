/**
 * ══════════════════════════════════════════
 * 📄 FILE: js/effects/EffectManager.js
 * 🔌 MODULE TYPE: effect
 * 📝 PURPOSE: Effect orchestration, registration, and lifecycle management
 * ══════════════════════════════════════════
 */

import eventBus from '../core/EventBus.js';
import config from '../core/Config.js';

class EffectManager {
  constructor() {
    this._effects = new Map();
    this._activeEffects = new Set();
    this._enabled = true;
    this._initialized = false;
  }

  /**
   * Register an effect
   * @param {string} id - Effect identifier
   * @param {class} EffectClass - Effect class
   * @param {Object} options - Registration options
   */
  register(id, EffectClass, options = {}) {
    if (this._effects.has(id)) {
      console.warn(`[EffectManager] Effect "${id}" already registered`);
      return false;
    }

    this._effects.set(id, {
      EffectClass,
      options: {
        enabled: options.enabled !== false,
        priority: options.priority || 0,
        ...options
      },
      instance: null
    });

    return true;
  }

  /**
   * Initialize all registered effects
   * @param {HTMLElement} container - Terminal container (optional)
   */
  async init(container = null) {
    if (this._initialized) return;

    // Find container if not provided
    this._container = container || document.body;

    // Check for reduced motion preference
    const reduceMotion = config.get('accessibility.reduceMotion');
    if (reduceMotion) {
      console.log('[EffectManager] Reduced motion preferred, disabling animations');
      this._enabled = false;
    }

    // Subscribe to events
    eventBus.on('effects:toggle', () => this.toggleAll());
    eventBus.on('effects:enable', ({ id }) => this.enable(id));
    eventBus.on('effects:disable', ({ id }) => this.disable(id));
    eventBus.on('accessibility:motionPreference', ({ reduced }) => {
      if (reduced) this.disableAll();
    });

    // Initialize each effect
    for (const [id, registration] of this._effects) {
      try {
        const configEnabled = config.get(`effects.${id}`, true);
        
        if (configEnabled && registration.options.enabled) {
          await this._initEffect(id, this._container);
        }
      } catch (error) {
        console.error(`[EffectManager] Failed to init effect "${id}":`, error);
      }
    }

    this._initialized = true;
    eventBus.emit('effects:ready', { effects: Array.from(this._activeEffects) });
  }

  /**
   * Initialize a single effect
   * @param {string} id - Effect ID
   * @param {HTMLElement} container - Container element
   */
  async _initEffect(id, container) {
    const registration = this._effects.get(id);
    if (!registration) return;

    const instance = new registration.EffectClass(container);
    
    if (typeof instance.init === 'function') {
      await instance.init();
    }

    registration.instance = instance;
    this._activeEffects.add(id);

    if (typeof instance.start === 'function') {
      instance.start();
    }
  }

  /**
   * Get an effect instance
   * @param {string} id - Effect ID
   * @returns {Object|null}
   */
  get(id) {
    const registration = this._effects.get(id);
    return registration ? registration.instance : null;
  }

  /**
   * Enable an effect
   * @param {string} id - Effect ID
   */
  async enable(id) {
    const registration = this._effects.get(id);
    if (!registration) return;

    registration.options.enabled = true;

    if (!registration.instance) {
      const container = document.querySelector('#terminal');
      await this._initEffect(id, container);
    } else if (typeof registration.instance.start === 'function') {
      registration.instance.start();
    }

    this._activeEffects.add(id);
    config.set(`effects.${id}`, true, true);
    eventBus.emit('effect:enabled', { id });
  }

  /**
   * Disable an effect
   * @param {string} id - Effect ID
   */
  disable(id) {
    const registration = this._effects.get(id);
    if (!registration || !registration.instance) return;

    if (typeof registration.instance.stop === 'function') {
      registration.instance.stop();
    }

    registration.options.enabled = false;
    this._activeEffects.delete(id);
    config.set(`effects.${id}`, false, true);
    eventBus.emit('effect:disabled', { id });
  }

  /**
   * Toggle an effect
   * @param {string} id - Effect ID
   */
  toggle(id) {
    if (this._activeEffects.has(id)) {
      this.disable(id);
    } else {
      this.enable(id);
    }
  }

  /**
   * Toggle all effects
   */
  toggleAll() {
    this._enabled = !this._enabled;

    if (this._enabled) {
      this.enableAll();
    } else {
      this.disableAll();
    }

    eventBus.emit('effects:toggled', { enabled: this._enabled });
  }

  /**
   * Enable all effects
   */
  enableAll() {
    this._enabled = true;
    for (const [id] of this._effects) {
      this.enable(id);
    }
  }

  /**
   * Disable all effects
   */
  disableAll() {
    this._enabled = false;
    for (const id of this._activeEffects) {
      this.disable(id);
    }
  }

  /**
   * Check if effects are globally enabled
   * @returns {boolean}
   */
  isEnabled() {
    return this._enabled;
  }

  /**
   * Check if a specific effect is active
   * @param {string} id - Effect ID
   * @returns {boolean}
   */
  isActive(id) {
    return this._activeEffects.has(id);
  }

  /**
   * Get list of active effects
   * @returns {string[]}
   */
  getActiveEffects() {
    return Array.from(this._activeEffects);
  }

  /**
   * Trigger a one-time effect
   * @param {string} id - Effect ID
   * @param {Object} params - Effect parameters
   */
  trigger(id, params = {}) {
    const registration = this._effects.get(id);
    if (!registration || !registration.instance) return;

    if (typeof registration.instance.trigger === 'function') {
      registration.instance.trigger(params);
    }
  }

  /**
   * Destroy all effects
   */
  destroy() {
    for (const [id, registration] of this._effects) {
      if (registration.instance && typeof registration.instance.destroy === 'function') {
        registration.instance.destroy();
      }
    }

    this._effects.clear();
    this._activeEffects.clear();
    this._initialized = false;
  }
}

// Singleton instance
const effectManager = new EffectManager();

// Export both as default and named for flexibility
export default effectManager;
export { effectManager, EffectManager };
