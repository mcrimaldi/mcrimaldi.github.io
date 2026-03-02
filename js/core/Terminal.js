/**
 * ══════════════════════════════════════════
 * 📄 FILE: js/core/Terminal.js
 * 🔌 MODULE TYPE: core
 * 📝 PURPOSE: Main orchestrator class coordinating plugins, effects, and themes
 * ══════════════════════════════════════════
 */

import eventBus from './EventBus.js';
import config from './Config.js';
import pluginManager from './PluginManager.js';

class Terminal {
  constructor(containerSelector = '#terminal') {
    this.container = document.querySelector(containerSelector);
    if (!this.container) {
      throw new Error(`Terminal container "${containerSelector}" not found`);
    }

    this.effectManager = null;
    this.themeManager = null;
    this.adapters = new Map();
    this._bootLines = [];
    this._ready = false;
  }

  /**
   * Static method to register plugins globally
   * @param {class} PluginClass - Plugin class
   * @param {Object} options - Registration options
   */
  static registerPlugin(PluginClass, options = {}) {
    return pluginManager.register(PluginClass, options);
  }

  /**
   * Static method to register adapters
   * @param {string} type - Adapter type (e.g., 'markdown', 'json')
   * @param {class} AdapterClass - Adapter class
   */
  static registerAdapter(type, AdapterClass) {
    if (!Terminal._adapters) {
      Terminal._adapters = new Map();
    }
    Terminal._adapters.set(type, AdapterClass);
  }

  /**
   * Initialize the terminal
   * @returns {Promise<void>}
   */
  async init() {
    try {
      // Load configuration
      await config.load();

      // Enable debug mode if configured
      if (config.get('debug')) {
        eventBus.setDebug(true);
      }

      eventBus.emit('terminal:initializing');

      // Setup structure only if not already present
      if (!this.container.querySelector('.terminal-sections') && 
          !this.container.querySelector('#terminal-sections')) {
        this._createStructure();
      }

      // Initialize adapters
      await this._initAdapters();

      // Show boot sequence if enabled
      if (config.get('terminal.showBootSequence')) {
        await this._runBootSequence();
      }

      // Initialize plugins with shared context
      const context = {
        terminal: this,
        container: this.container,
        eventBus,
        config,
        getAdapter: (type) => this.getAdapter(type)
      };

      await pluginManager.initializeAll(context);

      // Render all section plugins
      await this._renderSections();

      // Setup keyboard navigation
      this._setupKeyboardNav();

      // Setup accessibility
      this._setupAccessibility();

      this._ready = true;
      eventBus.emit('terminal:ready', { terminal: this });

    } catch (error) {
      console.error('[Terminal] Initialization failed:', error);
      eventBus.emit('error:occurred', { 
        source: 'Terminal.init', 
        error 
      });
      this._showError(error);
    }
  }

  /**
   * Set the effect manager
   * @param {Object} manager - EffectManager instance
   */
  setEffectManager(manager) {
    this.effectManager = manager;
  }

  /**
   * Set the theme manager
   * @param {Object} manager - ThemeManager instance
   */
  setThemeManager(manager) {
    this.themeManager = manager;
  }

  /**
   * Get an adapter by type
   * @param {string} type - Adapter type
   * @returns {Object|null}
   */
  getAdapter(type) {
    return this.adapters.get(type) || null;
  }

  /**
   * Check if terminal is ready
   * @returns {boolean}
   */
  isReady() {
    return this._ready;
  }

  /**
   * Get the output container
   * @returns {HTMLElement}
   */
  getOutputContainer() {
    // First try to find a .terminal-output element
    const output = this.container.querySelector('.terminal-output');
    if (output) return output;
    
    // Otherwise, the container itself is the output area
    return this.container;
  }
  
  /**
   * Get the sections container
   * @returns {HTMLElement}
   */
  getSectionsContainer() {
    return this.container.querySelector('.terminal-sections') || 
           this.container.querySelector('#terminal-sections') ||
           this.container;
  }

  /**
   * Write a line to the terminal output
   * @param {string} content - Content to write
   * @param {Object} options - { className, typing, delay }
   * @returns {Promise<HTMLElement>}
   */
  async writeLine(content, options = {}) {
    const output = this.getOutputContainer();
    const line = document.createElement('div');
    line.className = `terminal-line ${options.className || ''}`;

    if (options.typing && config.get('effects.typing')) {
      line.textContent = '';
      output.appendChild(line);
      await this._typeText(line, content, options.delay);
    } else {
      line.textContent = content;
      output.appendChild(line);
    }

    // Scroll to bottom
    output.scrollTop = output.scrollHeight;

    return line;
  }

  /**
   * Write a command prompt line
   * @param {string} command - Command text
   * @returns {Promise<HTMLElement>}
   */
  async writeCommand(command) {
    const prompt = config.get('terminal.prompt');
    return this.writeLine(`${prompt} ${command}`, { 
      className: 'command-line',
      typing: true
    });
  }

  /**
   * Add a section container
   * @param {string} id - Section ID
   * @returns {HTMLElement}
   */
  createSection(id) {
    const sectionsContainer = this.getSectionsContainer();
    const section = document.createElement('section');
    section.id = `section-${id}`;
    section.className = 'terminal-section';
    section.setAttribute('role', 'region');
    section.setAttribute('aria-label', id);
    sectionsContainer.appendChild(section);
    return section;
  }

  /**
   * Clear the terminal output
   */
  clear() {
    const output = this.getOutputContainer();
    output.innerHTML = '';
    eventBus.emit('terminal:cleared');
  }

  /**
   * Destroy the terminal instance
   */
  destroy() {
    pluginManager.destroy();
    this.adapters.clear();
    this._ready = false;
    eventBus.emit('terminal:destroyed');
  }

  // Private methods

  _createStructure() {
    // Create terminal structure
    this.container.innerHTML = `
      <div class="terminal-window">
        <header class="terminal-header">
          <div class="terminal-buttons">
            <span class="btn close" aria-hidden="true"></span>
            <span class="btn minimize" aria-hidden="true"></span>
            <span class="btn maximize" aria-hidden="true"></span>
          </div>
          <div class="terminal-title">terminal — visitor@portfolio</div>
          <div class="terminal-controls">
            <button class="control-btn theme-toggle" 
                    aria-label="Change theme" 
                    title="Change theme">
              <span class="icon">◐</span>
            </button>
            <button class="control-btn effects-toggle" 
                    aria-label="Toggle effects" 
                    title="Toggle effects">
              <span class="icon">✧</span>
            </button>
          </div>
        </header>
        <main class="terminal-body">
          <div class="terminal-output" role="log" aria-live="polite"></div>
        </main>
        <footer class="terminal-footer">
          <span class="status-indicator"></span>
          <span class="status-text">Ready</span>
        </footer>
      </div>
      <div class="scanlines" aria-hidden="true"></div>
      <div class="crt-overlay" aria-hidden="true"></div>
    `;

    // Setup control buttons
    this._setupControls();
  }

  _setupControls() {
    const themeBtn = this.container.querySelector('.theme-toggle');
    const effectsBtn = this.container.querySelector('.effects-toggle');

    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        eventBus.emit('theme:cycle');
      });
    }

    if (effectsBtn) {
      effectsBtn.addEventListener('click', () => {
        eventBus.emit('effects:toggle');
      });
    }
  }

  async _initAdapters() {
    // Initialize registered adapters
    if (Terminal._adapters) {
      for (const [type, adapterOrClass] of Terminal._adapters) {
        let adapter;
        
        // Check if it's already an instance or a class to instantiate
        if (typeof adapterOrClass === 'function') {
          // It's a class, instantiate it
          adapter = new adapterOrClass();
        } else {
          // It's already an instance
          adapter = adapterOrClass;
        }
        
        // Initialize if has init method
        if (typeof adapter.init === 'function') {
          await adapter.init();
        }
        
        this.adapters.set(type, adapter);
      }
    }
  }

  async _runBootSequence() {
    const bootDelay = config.get('terminal.bootDelay');
    
    this._bootLines = [
      { text: 'Initializing terminal...', delay: 30 },
      { text: 'Loading system modules...', delay: 40 },
      { text: 'Mounting content adapters...', delay: 30 },
      { text: 'Activating visual effects...', delay: 30 },
      { text: 'System ready.', delay: 50 },
      { text: '', delay: 20 },
    ];

    for (const line of this._bootLines) {
      await this.writeLine(line.text, { 
        className: 'boot-line', 
        typing: true 
      });
      await this._delay(line.delay);
    }

    await this._delay(bootDelay);
  }

  async _renderSections() {
    const sections = pluginManager.getByType('section');
    
    for (const plugin of sections) {
      try {
        // Write command line
        if (plugin.constructor.command) {
          await this.writeCommand(plugin.constructor.command);
        }

        // Create section container
        const container = this.createSection(plugin.constructor.id);

        // Let plugin render
        await plugin.render(container);

        eventBus.emit('section:rendered', { 
          id: plugin.constructor.id 
        });

        // Small delay between sections
        await this._delay(50);

      } catch (error) {
        console.error(`[Terminal] Failed to render section "${plugin.constructor.id}":`, error);
        eventBus.emit('error:occurred', {
          source: `section:${plugin.constructor.id}`,
          error
        });
      }
    }
  }

  _setupKeyboardNav() {
    document.addEventListener('keydown', (e) => {
      // Escape to collapse all sections
      if (e.key === 'Escape') {
        eventBus.emit('sections:collapseAll');
      }

      // 1-9 to expand sections
      if (e.key >= '1' && e.key <= '9' && !e.ctrlKey && !e.metaKey) {
        const num = parseInt(e.key, 10);
        const sections = pluginManager.getByType('section');
        if (sections[num - 1]) {
          eventBus.emit('section:toggle', { 
            id: sections[num - 1].constructor.id 
          });
        }
      }

      // T for theme cycling
      if (e.key === 't' && !e.ctrlKey && !e.metaKey && 
          document.activeElement.tagName !== 'INPUT') {
        eventBus.emit('theme:cycle');
      }
    });
  }

  _setupAccessibility() {
    // Respect prefers-reduced-motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    const handleMotionPreference = (e) => {
      config.set('accessibility.reduceMotion', e.matches);
      eventBus.emit('accessibility:motionPreference', { reduced: e.matches });
    };

    mediaQuery.addEventListener('change', handleMotionPreference);
    handleMotionPreference(mediaQuery);

    // Announce to screen readers
    if (config.get('accessibility.screenReaderAnnouncements')) {
      eventBus.on('terminal:ready', () => {
        this._announce('Terminal portfolio loaded. Use number keys 1-9 to navigate sections.');
      });
    }
  }

  _announce(message) {
    const announcer = document.createElement('div');
    announcer.setAttribute('role', 'status');
    announcer.setAttribute('aria-live', 'polite');
    announcer.className = 'sr-only';
    announcer.textContent = message;
    document.body.appendChild(announcer);
    
    setTimeout(() => announcer.remove(), 1000);
  }

  async _typeText(element, text, customDelay) {
    const speed = customDelay || config.get('terminal.typingSpeed');
    
    for (const char of text) {
      element.textContent += char;
      await this._delay(speed + Math.random() * 5);
    }
  }

  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  _showError(error) {
    const output = this.getOutputContainer();
    if (!output) return;

    const errorDiv = document.createElement('div');
    errorDiv.className = 'terminal-error';
    errorDiv.innerHTML = `
      <span class="error-prefix">ERROR:</span>
      <span class="error-message">${error.message}</span>
    `;
    output.appendChild(errorDiv);
  }
}

// Lazy singleton - created on first access
let _terminalInstance = null;

const terminal = {
  _getInstance(selector = '#terminal-output') {
    if (!_terminalInstance) {
      _terminalInstance = new Terminal(selector);
    }
    return _terminalInstance;
  },
  
  // Proxy all Terminal methods
  async init() {
    return this._getInstance().init();
  },
  
  writeLine(text, className) {
    return this._getInstance().writeLine(text, className);
  },
  
  writeCommand(command, output) {
    return this._getInstance().writeCommand(command, output);
  },
  
  clear() {
    return this._getInstance().clear();
  },
  
  getAdapter(type) {
    return this._getInstance().getAdapter(type);
  },
  
  getOutputContainer() {
    return this._getInstance().getOutputContainer();
  },
  
  getSectionsContainer() {
    return this._getInstance().getSectionsContainer();
  },
  
  isReady() {
    return _terminalInstance ? _terminalInstance._ready : false;
  }
};

// Static methods remain on Terminal class
Terminal.registerPlugin = function(PluginClass, options = {}) {
  return pluginManager.register(PluginClass, options);
};

Terminal.registerAdapter = function(type, adapter) {
  if (!Terminal._adapters) {
    Terminal._adapters = new Map();
  }
  Terminal._adapters.set(type, adapter);
};

export default Terminal;
export { Terminal, terminal };
