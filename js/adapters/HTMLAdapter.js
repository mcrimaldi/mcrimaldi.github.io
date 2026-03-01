/**
 * ══════════════════════════════════════════
 * 📄 FILE: js/adapters/HTMLAdapter.js
 * 🔌 MODULE TYPE: adapter
 * 📝 PURPOSE: Load and process HTML content files
 * ══════════════════════════════════════════
 */

import eventBus from '../core/EventBus.js';
import config from '../core/Config.js';

class HTMLAdapter {
  static type = 'html';

  constructor() {
    this.cache = new Map();
    this.cacheTTL = 300000;
    this.sanitize = true;
  }

  init() {
    this.cacheTTL = config.get('content.cacheTTL', 300000);
    this.sanitize = config.get('content.sanitizeHTML', true);
  }

  /**
   * Load an HTML file
   * @param {string} path - Path to HTML file
   * @returns {Promise<string>} HTML content
   */
  async load(path) {
    // Check cache
    if (config.get('content.cacheEnabled', true)) {
      const cached = this._getFromCache(path);
      if (cached) return cached;
    }

    try {
      const basePath = config.get('content.basePath', './content');
      const fullPath = path.startsWith('./') || path.startsWith('/') 
        ? path 
        : `${basePath}/${path.replace('content/', '')}`;

      const response = await fetch(fullPath);
      
      if (!response.ok) {
        throw new Error(`Failed to load: ${response.status}`);
      }

      let html = await response.text();

      // Sanitize if enabled
      if (this.sanitize) {
        html = this._sanitize(html);
      }

      // Process template variables
      html = this._processVariables(html);

      // Cache the result
      this._setCache(path, html);

      eventBus.emit('content:loaded', { 
        type: 'html', 
        path 
      });

      return html;

    } catch (error) {
      console.error(`[HTMLAdapter] Failed to load "${path}":`, error);
      eventBus.emit('error:occurred', { 
        source: 'HTMLAdapter', 
        error,
        path 
      });
      throw error;
    }
  }

  /**
   * Parse HTML string (returns as-is or sanitized)
   * @param {string} html - HTML content
   * @returns {string} Processed HTML
   */
  parse(html) {
    if (this.sanitize) {
      return this._sanitize(html);
    }
    return html;
  }

  /**
   * Extract content from specific selector
   * @param {string} html - Full HTML content
   * @param {string} selector - CSS selector
   * @returns {string} Extracted content
   */
  extract(html, selector) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const element = doc.querySelector(selector);
    
    return element ? element.innerHTML : '';
  }

  /**
   * Convert HTML to plain text
   * @param {string} html - HTML content
   * @returns {string} Plain text
   */
  toText(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    return doc.body.textContent || '';
  }

  /**
   * Clear the cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Remove specific item from cache
   * @param {string} path - Path to remove
   */
  invalidate(path) {
    this.cache.delete(path);
  }

  /**
   * Enable or disable sanitization
   * @param {boolean} enabled
   */
  setSanitize(enabled) {
    this.sanitize = enabled;
  }

  // Private methods

  _sanitize(html) {
    // Remove potentially dangerous elements
    const dangerousElements = [
      'script', 'iframe', 'object', 'embed', 'form',
      'input', 'button', 'select', 'textarea'
    ];

    let sanitized = html;

    // Remove dangerous tags
    for (const tag of dangerousElements) {
      const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi');
      sanitized = sanitized.replace(regex, '');
      
      // Also remove self-closing versions
      const selfClosing = new RegExp(`<${tag}[^>]*\\/?>`, 'gi');
      sanitized = sanitized.replace(selfClosing, '');
    }

    // Remove dangerous attributes
    const dangerousAttrs = [
      'onclick', 'onload', 'onerror', 'onmouseover', 'onmouseout',
      'onfocus', 'onblur', 'onsubmit', 'onreset', 'onchange',
      'onkeydown', 'onkeyup', 'onkeypress'
    ];

    for (const attr of dangerousAttrs) {
      const regex = new RegExp(`\\s${attr}\\s*=\\s*["'][^"']*["']`, 'gi');
      sanitized = sanitized.replace(regex, '');
    }

    // Remove javascript: URLs
    sanitized = sanitized.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"');

    // Remove data: URLs in src attributes (can be used for XSS)
    sanitized = sanitized.replace(/src\s*=\s*["']data:[^"']*["']/gi, 'src=""');

    return sanitized;
  }

  _processVariables(html) {
    // Replace template variables like {{variable}}
    return html.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      // Check config for variable
      const value = config.get(`variables.${key}`);
      if (value !== undefined) {
        return value;
      }

      // Check global variables
      const globalVars = {
        year: new Date().getFullYear(),
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString()
      };

      return globalVars[key] || match;
    });
  }

  _getFromCache(path) {
    const cached = this.cache.get(path);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.cacheTTL) {
      this.cache.delete(path);
      return null;
    }

    return cached.content;
  }

  _setCache(path, content) {
    this.cache.set(path, {
      content,
      timestamp: Date.now()
    });
  }
}

// Singleton instance
const htmlAdapter = new HTMLAdapter();

export default htmlAdapter;
export { htmlAdapter, HTMLAdapter };
