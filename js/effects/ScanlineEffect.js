/**
 * ══════════════════════════════════════════
 * 📄 FILE: js/effects/ScanlineEffect.js
 * 🔌 MODULE TYPE: effect
 * 📝 PURPOSE: CRT-style scanline overlay effect
 * ══════════════════════════════════════════
 */

class ScanlineEffect {
  static id = 'scanlines';

  constructor(container) {
    this.container = container || document.body;
    this.element = null;
    this.intensity = 0.15;
    this.animated = false;
  }

  init() {
    // Find or create scanline element
    this.element = document.querySelector('.scanlines');
    
    if (!this.element) {
      this.element = document.createElement('div');
      this.element.className = 'scanlines';
      this.element.setAttribute('aria-hidden', 'true');
      document.body.appendChild(this.element);
    }
  }

  start() {
    if (!this.element) return;
    
    this.element.classList.add('active');
    this.element.style.setProperty('--scanline-intensity', this.intensity);
  }

  stop() {
    if (!this.element) return;
    
    this.element.classList.remove('active');
  }

  /**
   * Set scanline intensity
   * @param {number} value - Intensity from 0 to 1
   */
  setIntensity(value) {
    this.intensity = Math.max(0, Math.min(1, value));
    if (this.element) {
      this.element.style.setProperty('--scanline-intensity', this.intensity);
    }
  }

  /**
   * Trigger a glitch/flicker effect
   * @param {Object} params - { duration: ms }
   */
  trigger(params = {}) {
    if (!this.element) return;

    const duration = params.duration || 200;
    this.element.classList.add('glitch');
    
    setTimeout(() => {
      this.element.classList.remove('glitch');
    }, duration);
  }

  destroy() {
    if (this.element && this.element.parentNode) {
      this.element.remove();
    }
    this.element = null;
  }
}

export default ScanlineEffect;
export { ScanlineEffect };
