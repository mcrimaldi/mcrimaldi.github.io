/**
 * ══════════════════════════════════════════
 * 📄 FILE: js/effects/GlowEffect.js
 * 🔌 MODULE TYPE: effect
 * 📝 PURPOSE: Phosphor CRT glow effect for text and elements
 * ══════════════════════════════════════════
 */

class GlowEffect {
  static id = 'glow';

  constructor(container) {
    this.container = container || document.body;
    this.intensity = 1;
    this.pulseEnabled = false;
    this.pulseInterval = null;
  }

  init() {
    this._injectStyles();
  }

  start() {
    if (this.container && this.container.classList) {
      this.container.classList.add('glow-enabled');
    }
    document.body.classList.add('glow-enabled');
    this._applyGlow();
  }

  stop() {
    if (this.container && this.container.classList) {
      this.container.classList.remove('glow-enabled');
    }
    document.body.classList.remove('glow-enabled');
    this._stopPulse();
  }

  /**
   * Set glow intensity
   * @param {number} value - Intensity from 0 to 2
   */
  setIntensity(value) {
    this.intensity = Math.max(0, Math.min(2, value));
    this._applyGlow();
  }

  /**
   * Enable/disable pulse effect
   * @param {boolean} enabled
   */
  setPulse(enabled) {
    this.pulseEnabled = enabled;
    
    if (enabled) {
      this._startPulse();
    } else {
      this._stopPulse();
    }
  }

  /**
   * Trigger a glow flash
   * @param {Object} params - { intensity: number, duration: ms }
   */
  trigger(params = {}) {
    const intensity = params.intensity || 2;
    const duration = params.duration || 300;

    const original = this.intensity;
    this.setIntensity(intensity);
    
    setTimeout(() => {
      this.setIntensity(original);
    }, duration);
  }

  _applyGlow() {
    const root = document.documentElement;
    root.style.setProperty('--glow-intensity', this.intensity);
    
    // Calculate glow spread based on intensity
    const spread = 2 + (this.intensity * 4);
    root.style.setProperty('--glow-spread', `${spread}px`);
  }

  _startPulse() {
    if (this.pulseInterval) return;

    let direction = 1;
    let current = this.intensity;
    const min = this.intensity * 0.7;
    const max = this.intensity * 1.3;
    const step = 0.02;

    this.pulseInterval = setInterval(() => {
      current += step * direction;
      
      if (current >= max) {
        direction = -1;
      } else if (current <= min) {
        direction = 1;
      }

      this._applyGlowDirect(current);
    }, 50);
  }

  _stopPulse() {
    if (this.pulseInterval) {
      clearInterval(this.pulseInterval);
      this.pulseInterval = null;
      this._applyGlow();
    }
  }

  _applyGlowDirect(value) {
    const root = document.documentElement;
    root.style.setProperty('--glow-intensity', value);
    const spread = 2 + (value * 4);
    root.style.setProperty('--glow-spread', `${spread}px`);
  }

  _injectStyles() {
    if (document.getElementById('glow-effect-styles')) return;

    const style = document.createElement('style');
    style.id = 'glow-effect-styles';
    style.textContent = `
      :root {
        --glow-intensity: 1;
        --glow-spread: 6px;
      }

      .glow-enabled .terminal-line,
      .glow-enabled .section-title,
      .glow-enabled .command-line,
      .glow-enabled .terminal-cursor {
        text-shadow: 
          0 0 calc(var(--glow-spread) * 0.5) var(--terminal-primary),
          0 0 var(--glow-spread) var(--terminal-glow),
          0 0 calc(var(--glow-spread) * 2) var(--terminal-glow);
        filter: brightness(calc(0.9 + (var(--glow-intensity) * 0.1)));
      }

      .glow-enabled .terminal-header,
      .glow-enabled .terminal-footer {
        box-shadow: 
          inset 0 0 calc(var(--glow-spread) * 2) rgba(var(--terminal-primary-rgb), 0.1),
          0 0 calc(var(--glow-spread) * 0.5) var(--terminal-glow);
      }

      .glow-enabled .section-header:hover {
        text-shadow: 
          0 0 calc(var(--glow-spread) * 0.75) var(--terminal-primary),
          0 0 calc(var(--glow-spread) * 1.5) var(--terminal-glow);
      }

      .glow-enabled .skill-bar {
        text-shadow: 
          0 0 calc(var(--glow-spread) * 0.3) var(--terminal-primary);
      }

      .glow-enabled a:hover,
      .glow-enabled button:hover {
        text-shadow: 
          0 0 calc(var(--glow-spread) * 0.75) var(--terminal-accent),
          0 0 calc(var(--glow-spread) * 1.5) var(--terminal-glow);
      }
    `;
    document.head.appendChild(style);
  }

  destroy() {
    this.stop();
    
    const style = document.getElementById('glow-effect-styles');
    if (style) {
      style.remove();
    }

    const root = document.documentElement;
    root.style.removeProperty('--glow-intensity');
    root.style.removeProperty('--glow-spread');
  }
}

export default GlowEffect;
export { GlowEffect };
