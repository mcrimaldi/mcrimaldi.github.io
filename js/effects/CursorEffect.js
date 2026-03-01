/**
 * ══════════════════════════════════════════
 * 📄 FILE: js/effects/CursorEffect.js
 * 🔌 MODULE TYPE: effect
 * 📝 PURPOSE: Terminal-style blinking cursor effect
 * ══════════════════════════════════════════
 */

class CursorEffect {
  static id = 'cursor';

  constructor(container) {
    this.container = container;
    this.cursors = [];
    this.blinkInterval = null;
    this.blinkRate = 530; // ms
    this.cursorChar = '█';
    this.visible = true;
  }

  init() {
    // Add CSS for cursor
    this._injectStyles();
  }

  start() {
    // Start global blink timer
    if (this.blinkInterval) return;

    this.blinkInterval = setInterval(() => {
      this.visible = !this.visible;
      this._updateCursors();
    }, this.blinkRate);
  }

  stop() {
    if (this.blinkInterval) {
      clearInterval(this.blinkInterval);
      this.blinkInterval = null;
    }

    // Make all cursors visible when stopped
    this.visible = true;
    this._updateCursors();
  }

  /**
   * Create a cursor element
   * @param {HTMLElement} parent - Parent element
   * @returns {HTMLElement} Cursor element
   */
  createCursor(parent) {
    const cursor = document.createElement('span');
    cursor.className = 'terminal-cursor';
    cursor.setAttribute('aria-hidden', 'true');
    cursor.textContent = this.cursorChar;
    
    if (parent) {
      parent.appendChild(cursor);
    }

    this.cursors.push(cursor);
    return cursor;
  }

  /**
   * Remove a cursor
   * @param {HTMLElement} cursor - Cursor element to remove
   */
  removeCursor(cursor) {
    const index = this.cursors.indexOf(cursor);
    if (index > -1) {
      this.cursors.splice(index, 1);
    }
    if (cursor.parentNode) {
      cursor.remove();
    }
  }

  /**
   * Set cursor character
   * @param {string} char - Cursor character
   */
  setCursorChar(char) {
    this.cursorChar = char;
    this.cursors.forEach(cursor => {
      cursor.textContent = char;
    });
  }

  /**
   * Set blink rate
   * @param {number} ms - Milliseconds between blinks
   */
  setBlinkRate(ms) {
    this.blinkRate = ms;
    
    // Restart timer with new rate
    if (this.blinkInterval) {
      this.stop();
      this.start();
    }
  }

  /**
   * Trigger cursor flash
   */
  trigger() {
    this.cursors.forEach(cursor => {
      cursor.classList.add('flash');
      setTimeout(() => cursor.classList.remove('flash'), 100);
    });
  }

  _updateCursors() {
    const opacity = this.visible ? 1 : 0;
    this.cursors.forEach(cursor => {
      cursor.style.opacity = opacity;
    });
  }

  _injectStyles() {
    if (document.getElementById('cursor-effect-styles')) return;

    const style = document.createElement('style');
    style.id = 'cursor-effect-styles';
    style.textContent = `
      .terminal-cursor {
        display: inline-block;
        color: var(--terminal-primary);
        animation: none;
        transition: opacity 0.05s ease;
      }
      
      .terminal-cursor.flash {
        color: var(--terminal-background);
        background: var(--terminal-primary);
      }
      
      @keyframes cursor-blink {
        0%, 50% { opacity: 1; }
        51%, 100% { opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  destroy() {
    this.stop();
    this.cursors.forEach(cursor => {
      if (cursor.parentNode) {
        cursor.remove();
      }
    });
    this.cursors = [];

    const style = document.getElementById('cursor-effect-styles');
    if (style) {
      style.remove();
    }
  }
}

export default CursorEffect;
export { CursorEffect };
