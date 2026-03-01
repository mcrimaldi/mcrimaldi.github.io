/**
 * ══════════════════════════════════════════
 * 📄 FILE: js/plugins/SectionPlugin.js
 * 🔌 MODULE TYPE: plugin (base class)
 * 📝 PURPOSE: Abstract base class for all section plugins with common functionality
 * ══════════════════════════════════════════
 */

import eventBus from '../core/EventBus.js';

/**
 * Base class for section plugins
 * Extend this class to create new content sections
 */
class SectionPlugin {
  // Static properties to be overridden by subclasses
  static id = 'base';
  static type = 'section';
  static command = 'cat section.txt';
  static title = 'Section';
  static contentFile = null;
  static dependencies = [];
  static order = 0;

  constructor(context) {
    if (new.target === SectionPlugin) {
      throw new Error('SectionPlugin is abstract and cannot be instantiated directly');
    }

    this.context = context;
    this.terminal = context.terminal;
    this.config = context.config;
    this.container = null;
    this.content = null;
    this.expanded = false;
    this._initialized = false;

    // Bind event handlers
    this._onToggle = this._onToggle.bind(this);
    this._onCollapseAll = this._onCollapseAll.bind(this);
  }

  /**
   * Initialize the plugin
   * Called automatically by PluginManager
   */
  async init() {
    if (this._initialized) return;

    // Load content if contentFile is specified
    if (this.constructor.contentFile) {
      await this.loadContent();
    }

    // Subscribe to events
    eventBus.on('section:toggle', this._onToggle, { context: this });
    eventBus.on('sections:collapseAll', this._onCollapseAll, { context: this });

    this._initialized = true;
  }

  /**
   * Load content using the appropriate adapter
   * @returns {Promise<string>}
   */
  async loadContent() {
    const contentFile = this.constructor.contentFile;
    if (!contentFile) return null;

    try {
      // Determine adapter type from file extension
      const ext = contentFile.split('.').pop().toLowerCase();
      const adapterType = this._getAdapterType(ext);
      const adapter = this.context.getAdapter(adapterType);

      if (!adapter) {
        console.warn(`[${this.constructor.id}] No adapter found for "${adapterType}"`);
        return this._loadFallback();
      }

      this.content = await adapter.load(contentFile);
      eventBus.emit('content:loaded', { 
        id: this.constructor.id, 
        file: contentFile 
      });

      return this.content;

    } catch (error) {
      console.error(`[${this.constructor.id}] Failed to load content:`, error);
      return this._loadFallback();
    }
  }

  /**
   * Render the section
   * Override in subclasses for custom rendering
   * @param {HTMLElement} container - Container element
   */
  async render(container) {
    this.container = container;
    container.classList.add(`section-${this.constructor.id}`);

    // Create section structure
    const header = this._createHeader();
    const body = this._createBody();

    container.appendChild(header);
    container.appendChild(body);

    // Render custom content
    await this.renderContent(body);

    // Setup interactions
    this._setupInteractions();
  }

  /**
   * Render section-specific content
   * Override in subclasses
   * @param {HTMLElement} body - Body container
   */
  async renderContent(body) {
    // Default: render loaded content or placeholder
    if (this.content) {
      body.innerHTML = this.content;
    } else {
      body.innerHTML = `<p>Content for ${this.constructor.id} section</p>`;
    }
  }

  /**
   * Expand the section
   */
  expand() {
    if (this.expanded || !this.container) return;

    this.expanded = true;
    this.container.classList.add('expanded');
    
    const body = this.container.querySelector('.section-body');
    if (body) {
      body.setAttribute('aria-hidden', 'false');
    }

    const header = this.container.querySelector('.section-header');
    if (header) {
      header.setAttribute('aria-expanded', 'true');
    }

    this.onExpand();
    eventBus.emit('section:expanded', { id: this.constructor.id });
  }

  /**
   * Collapse the section
   */
  collapse() {
    if (!this.expanded || !this.container) return;

    this.expanded = false;
    this.container.classList.remove('expanded');
    
    const body = this.container.querySelector('.section-body');
    if (body) {
      body.setAttribute('aria-hidden', 'true');
    }

    const header = this.container.querySelector('.section-header');
    if (header) {
      header.setAttribute('aria-expanded', 'false');
    }

    this.onCollapse();
    eventBus.emit('section:collapsed', { id: this.constructor.id });
  }

  /**
   * Toggle expanded state
   */
  toggle() {
    if (this.expanded) {
      this.collapse();
    } else {
      this.expand();
    }
  }

  /**
   * Hook called when section expands
   * Override in subclasses for custom behavior
   */
  onExpand() {}

  /**
   * Hook called when section collapses
   * Override in subclasses for custom behavior
   */
  onCollapse() {}

  /**
   * Emit an event (convenience method)
   * @param {string} event - Event name
   * @param {any} data - Event data
   */
  emit(event, data = {}) {
    eventBus.emit(event, { ...data, source: this.constructor.id });
  }

  /**
   * Disable the plugin
   */
  disable() {
    if (this.container) {
      this.container.style.display = 'none';
    }
  }

  /**
   * Enable the plugin
   */
  enable() {
    if (this.container) {
      this.container.style.display = '';
    }
  }

  /**
   * Destroy the plugin
   */
  destroy() {
    eventBus.off('section:toggle', this._onToggle);
    eventBus.off('sections:collapseAll', this._onCollapseAll);
    
    if (this.container) {
      this.container.remove();
    }

    this._initialized = false;
  }

  // Protected/Private methods

  _createHeader() {
    const header = document.createElement('header');
    header.className = 'section-header';
    header.setAttribute('role', 'button');
    header.setAttribute('tabindex', '0');
    header.setAttribute('aria-expanded', 'false');
    header.setAttribute('aria-controls', `${this.constructor.id}-body`);

    header.innerHTML = `
      <span class="section-icon">${this._getIcon()}</span>
      <span class="section-title">${this.constructor.title}</span>
      <span class="section-toggle" aria-hidden="true">▸</span>
    `;

    return header;
  }

  _createBody() {
    const body = document.createElement('div');
    body.className = 'section-body';
    body.id = `${this.constructor.id}-body`;
    body.setAttribute('aria-hidden', 'true');
    return body;
  }

  _setupInteractions() {
    const header = this.container.querySelector('.section-header');
    
    if (header) {
      header.addEventListener('click', () => this.toggle());
      header.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.toggle();
        }
      });
    }
  }

  _onToggle({ id }) {
    if (id === this.constructor.id) {
      this.toggle();
    }
  }

  _onCollapseAll() {
    this.collapse();
  }

  _getAdapterType(ext) {
    const mapping = {
      'md': 'markdown',
      'markdown': 'markdown',
      'json': 'json',
      'html': 'html',
      'htm': 'html'
    };
    return mapping[ext] || 'markdown';
  }

  _getIcon() {
    // Default icons based on section id
    const icons = {
      'about': '◈',
      'skills': '◆',
      'publications': '📚',
      'projects': '◇',
      'experience': '◉',
      'contact': '◎'
    };
    return icons[this.constructor.id] || '◇';
  }

  async _loadFallback() {
    // Fallback content when adapter fails
    return `<p>Unable to load content for ${this.constructor.id}</p>`;
  }
}

export default SectionPlugin;
export { SectionPlugin };
