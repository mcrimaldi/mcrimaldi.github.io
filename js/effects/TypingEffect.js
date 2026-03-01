/**
 * ══════════════════════════════════════════
 * 📄 FILE: js/effects/TypingEffect.js
 * 🔌 MODULE TYPE: effect
 * 📝 PURPOSE: Typewriter-style text animation effect
 * ══════════════════════════════════════════
 */

import eventBus from '../core/EventBus.js';

class TypingEffect {
  static id = 'typing';

  constructor(container) {
    this.container = container;
    this.speed = 30; // ms per character
    this.variance = 20; // random variance
    this.queue = [];
    this.isTyping = false;
    this.paused = false;
  }

  init() {
    // Subscribe to typing requests
    eventBus.on('typing:request', ({ element, text, callback }) => {
      this.type(element, text).then(callback);
    });
  }

  start() {
    this.paused = false;
    this._processQueue();
  }

  stop() {
    this.paused = true;
  }

  /**
   * Type text into an element
   * @param {HTMLElement} element - Target element
   * @param {string} text - Text to type
   * @param {Object} options - { speed, variance, append }
   * @returns {Promise<void>}
   */
  async type(element, text, options = {}) {
    const speed = options.speed || this.speed;
    const variance = options.variance || this.variance;
    const append = options.append || false;

    if (!append) {
      element.textContent = '';
    }

    for (let i = 0; i < text.length; i++) {
      if (this.paused) {
        await this._waitForResume();
      }

      const char = text[i];
      element.textContent += char;

      // Calculate delay with variance
      const delay = speed + (Math.random() * variance) - (variance / 2);
      
      // Longer pause after punctuation
      const punctuationDelay = this._getPunctuationDelay(char);
      
      await this._delay(delay + punctuationDelay);
    }

    eventBus.emit('typing:complete', { element, text });
  }

  /**
   * Type multiple lines sequentially
   * @param {HTMLElement} container - Container element
   * @param {string[]} lines - Array of lines to type
   * @param {Object} options - Typing options
   * @returns {Promise<void>}
   */
  async typeLines(container, lines, options = {}) {
    const lineDelay = options.lineDelay || 100;

    for (const line of lines) {
      const lineElement = document.createElement('div');
      lineElement.className = options.lineClass || 'typed-line';
      container.appendChild(lineElement);

      await this.type(lineElement, line, options);
      await this._delay(lineDelay);
    }
  }

  /**
   * Type with a callback for each character
   * @param {HTMLElement} element - Target element
   * @param {string} text - Text to type
   * @param {Function} onChar - Callback for each character
   * @returns {Promise<void>}
   */
  async typeWithCallback(element, text, onChar) {
    for (let i = 0; i < text.length; i++) {
      if (this.paused) {
        await this._waitForResume();
      }

      const char = text[i];
      element.textContent += char;
      
      if (onChar) {
        onChar(char, i, text);
      }

      const delay = this.speed + (Math.random() * this.variance);
      await this._delay(delay);
    }
  }

  /**
   * Erase text from an element
   * @param {HTMLElement} element - Target element
   * @param {Object} options - { speed }
   * @returns {Promise<void>}
   */
  async erase(element, options = {}) {
    const speed = options.speed || this.speed / 2;
    const text = element.textContent;

    for (let i = text.length; i > 0; i--) {
      if (this.paused) {
        await this._waitForResume();
      }

      element.textContent = text.substring(0, i - 1);
      await this._delay(speed);
    }

    eventBus.emit('typing:erased', { element });
  }

  /**
   * Set typing speed
   * @param {number} speed - Milliseconds per character
   */
  setSpeed(speed) {
    this.speed = Math.max(1, speed);
  }

  /**
   * Set variance
   * @param {number} variance - Random variance in ms
   */
  setVariance(variance) {
    this.variance = Math.max(0, variance);
  }

  /**
   * Queue a typing animation
   * @param {Object} task - { element, text, options }
   */
  queueTyping(task) {
    this.queue.push(task);
    this._processQueue();
  }

  /**
   * Clear the typing queue
   */
  clearQueue() {
    this.queue = [];
  }

  /**
   * Trigger instant type (for reduced motion)
   * @param {HTMLElement} element - Target element
   * @param {string} text - Text to show
   */
  trigger({ element, text }) {
    if (element && text) {
      element.textContent = text;
    }
  }

  async _processQueue() {
    if (this.isTyping || this.queue.length === 0 || this.paused) {
      return;
    }

    this.isTyping = true;
    const task = this.queue.shift();

    try {
      await this.type(task.element, task.text, task.options);
      if (task.callback) {
        task.callback();
      }
    } catch (error) {
      console.error('[TypingEffect] Error processing queue:', error);
    }

    this.isTyping = false;
    this._processQueue();
  }

  _getPunctuationDelay(char) {
    const delays = {
      '.': 150,
      '!': 150,
      '?': 150,
      ',': 80,
      ';': 100,
      ':': 80,
      '\n': 100
    };
    return delays[char] || 0;
  }

  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  _waitForResume() {
    return new Promise(resolve => {
      const check = () => {
        if (!this.paused) {
          resolve();
        } else {
          setTimeout(check, 50);
        }
      };
      check();
    });
  }

  destroy() {
    this.stop();
    this.clearQueue();
    eventBus.off('typing:request');
  }
}

export default TypingEffect;
export { TypingEffect };
