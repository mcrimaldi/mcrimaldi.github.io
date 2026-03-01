/**
 * ══════════════════════════════════════════
 * 📄 FILE: js/core/EventBus.js
 * 🔌 MODULE TYPE: core
 * 📝 PURPOSE: Pub/sub event system for decoupled component communication
 * ══════════════════════════════════════════
 */

class EventBus {
  constructor() {
    this._events = new Map();
    this._onceEvents = new Map();
    this._history = [];
    this._maxHistory = 100;
    this._debug = false;
  }

  /**
   * Enable or disable debug logging
   * @param {boolean} enabled
   */
  setDebug(enabled) {
    this._debug = enabled;
  }

  /**
   * Subscribe to an event
   * @param {string} event - Event name
   * @param {Function} callback - Handler function
   * @param {Object} options - { priority: number, context: any }
   * @returns {Function} Unsubscribe function
   */
  on(event, callback, options = {}) {
    if (typeof callback !== 'function') {
      throw new TypeError('EventBus: callback must be a function');
    }

    if (!this._events.has(event)) {
      this._events.set(event, []);
    }

    const handler = {
      callback,
      priority: options.priority || 0,
      context: options.context || null,
      id: Symbol('handler')
    };

    const handlers = this._events.get(event);
    handlers.push(handler);
    handlers.sort((a, b) => b.priority - a.priority);

    if (this._debug) {
      console.log(`[EventBus] Subscribed to "${event}"`, handler);
    }

    return () => this.off(event, handler.id);
  }

  /**
   * Subscribe to an event once
   * @param {string} event - Event name
   * @param {Function} callback - Handler function
   * @returns {Function} Unsubscribe function
   */
  once(event, callback) {
    const unsubscribe = this.on(event, (...args) => {
      unsubscribe();
      callback.apply(null, args);
    });
    return unsubscribe;
  }

  /**
   * Unsubscribe from an event
   * @param {string} event - Event name
   * @param {Symbol|Function} identifier - Handler ID or callback function
   */
  off(event, identifier) {
    if (!this._events.has(event)) return;

    const handlers = this._events.get(event);
    const index = handlers.findIndex(h => 
      h.id === identifier || h.callback === identifier
    );

    if (index > -1) {
      handlers.splice(index, 1);
      if (this._debug) {
        console.log(`[EventBus] Unsubscribed from "${event}"`);
      }
    }

    if (handlers.length === 0) {
      this._events.delete(event);
    }
  }

  /**
   * Emit an event
   * @param {string} event - Event name
   * @param {any} data - Event data
   * @returns {Promise<void>}
   */
  async emit(event, data = {}) {
    const eventData = {
      event,
      data,
      timestamp: Date.now()
    };

    this._history.push(eventData);
    if (this._history.length > this._maxHistory) {
      this._history.shift();
    }

    if (this._debug) {
      console.log(`[EventBus] Emitting "${event}"`, data);
    }

    if (!this._events.has(event)) return;

    const handlers = this._events.get(event);
    const promises = handlers.map(handler => {
      try {
        const result = handler.callback.call(handler.context, data);
        return result instanceof Promise ? result : Promise.resolve(result);
      } catch (error) {
        console.error(`[EventBus] Error in handler for "${event}":`, error);
        this.emit('error:occurred', { event, error, originalData: data });
        return Promise.resolve();
      }
    });

    await Promise.all(promises);
  }

  /**
   * Emit an event synchronously
   * @param {string} event - Event name
   * @param {any} data - Event data
   */
  emitSync(event, data = {}) {
    if (!this._events.has(event)) return;

    const handlers = this._events.get(event);
    handlers.forEach(handler => {
      try {
        handler.callback.call(handler.context, data);
      } catch (error) {
        console.error(`[EventBus] Error in handler for "${event}":`, error);
      }
    });
  }

  /**
   * Check if event has subscribers
   * @param {string} event - Event name
   * @returns {boolean}
   */
  hasSubscribers(event) {
    return this._events.has(event) && this._events.get(event).length > 0;
  }

  /**
   * Get event history
   * @param {string} event - Optional event name filter
   * @returns {Array}
   */
  getHistory(event = null) {
    if (event) {
      return this._history.filter(e => e.event === event);
    }
    return [...this._history];
  }

  /**
   * Clear all subscriptions
   */
  clear() {
    this._events.clear();
    this._history = [];
    if (this._debug) {
      console.log('[EventBus] Cleared all subscriptions');
    }
  }

  /**
   * Get list of all registered events
   * @returns {string[]}
   */
  getRegisteredEvents() {
    return Array.from(this._events.keys());
  }
}

// Singleton instance
const eventBus = new EventBus();

// Export both as default and named for flexibility
export default eventBus;
export { eventBus, EventBus };
