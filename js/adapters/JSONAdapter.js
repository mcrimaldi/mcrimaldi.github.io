/**
 * ══════════════════════════════════════════
 * 📄 FILE: js/adapters/JSONAdapter.js
 * 🔌 MODULE TYPE: adapter
 * 📝 PURPOSE: Load and parse JSON content files
 * ══════════════════════════════════════════
 */

import eventBus from '../core/EventBus.js';
import config from '../core/Config.js';

class JSONAdapter {
  static type = 'json';

  constructor() {
    this.cache = new Map();
    this.cacheTTL = 300000;
  }

  init() {
    this.cacheTTL = config.get('content.cacheTTL', 300000);
  }

  /**
   * Load a JSON file
   * @param {string} path - Path to JSON file
   * @returns {Promise<Object>} Parsed JSON object
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

      const data = await response.json();

      // Validate JSON structure if schema is provided
      if (data._schema) {
        this._validate(data, data._schema);
      }

      // Cache the result
      this._setCache(path, data);

      eventBus.emit('content:loaded', { 
        type: 'json', 
        path,
        keys: Object.keys(data)
      });

      return data;

    } catch (error) {
      console.error(`[JSONAdapter] Failed to load "${path}":`, error);
      eventBus.emit('error:occurred', { 
        source: 'JSONAdapter', 
        error,
        path 
      });
      throw error;
    }
  }

  /**
   * Parse a JSON string
   * @param {string} jsonString - JSON string
   * @returns {Object} Parsed object
   */
  parse(jsonString) {
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('[JSONAdapter] Parse error:', error);
      throw new Error('Invalid JSON format');
    }
  }

  /**
   * Convert JSON data to HTML
   * @param {Object} data - JSON data
   * @param {string} template - Template name or custom template string
   * @returns {string} HTML content
   */
  toHTML(data, template = 'default') {
    const templates = {
      default: this._defaultTemplate,
      list: this._listTemplate,
      table: this._tableTemplate,
      cards: this._cardsTemplate
    };

    const templateFn = typeof template === 'function' 
      ? template 
      : templates[template] || templates.default;

    return templateFn.call(this, data);
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

  // Private methods

  _validate(data, schema) {
    // Simple schema validation
    for (const [key, type] of Object.entries(schema)) {
      if (key === '_schema') continue;
      
      if (!(key in data)) {
        console.warn(`[JSONAdapter] Missing required field: ${key}`);
        continue;
      }

      const actualType = Array.isArray(data[key]) ? 'array' : typeof data[key];
      if (actualType !== type) {
        console.warn(`[JSONAdapter] Type mismatch for ${key}: expected ${type}, got ${actualType}`);
      }
    }
  }

  _defaultTemplate(data) {
    if (Array.isArray(data)) {
      return this._listTemplate(data);
    }

    let html = '<div class="json-content">';
    
    for (const [key, value] of Object.entries(data)) {
      if (key.startsWith('_')) continue; // Skip meta fields
      
      html += `<div class="json-field">`;
      html += `<span class="json-key">${this._formatKey(key)}:</span>`;
      html += `<span class="json-value">${this._formatValue(value)}</span>`;
      html += `</div>`;
    }

    html += '</div>';
    return html;
  }

  _listTemplate(data) {
    if (!Array.isArray(data)) {
      data = Object.values(data).filter(v => typeof v === 'object');
    }

    let html = '<ul class="json-list">';
    
    for (const item of data) {
      html += '<li class="json-list-item">';
      
      if (typeof item === 'object') {
        html += this._defaultTemplate(item);
      } else {
        html += this._formatValue(item);
      }
      
      html += '</li>';
    }

    html += '</ul>';
    return html;
  }

  _tableTemplate(data) {
    if (!Array.isArray(data) || data.length === 0) {
      return '<p>No data available</p>';
    }

    const headers = Object.keys(data[0]).filter(k => !k.startsWith('_'));
    
    let html = '<table class="json-table">';
    
    // Header row
    html += '<thead><tr>';
    for (const header of headers) {
      html += `<th>${this._formatKey(header)}</th>`;
    }
    html += '</tr></thead>';

    // Data rows
    html += '<tbody>';
    for (const row of data) {
      html += '<tr>';
      for (const header of headers) {
        html += `<td>${this._formatValue(row[header])}</td>`;
      }
      html += '</tr>';
    }
    html += '</tbody></table>';

    return html;
  }

  _cardsTemplate(data) {
    if (!Array.isArray(data)) {
      data = [data];
    }

    let html = '<div class="json-cards">';

    for (const item of data) {
      html += '<div class="json-card">';
      
      if (item.title) {
        html += `<h3 class="card-title">${item.title}</h3>`;
      }
      
      if (item.description) {
        html += `<p class="card-description">${item.description}</p>`;
      }

      // Render other fields
      for (const [key, value] of Object.entries(item)) {
        if (['title', 'description'].includes(key) || key.startsWith('_')) continue;
        
        html += `<div class="card-field">`;
        html += `<span class="field-label">${this._formatKey(key)}:</span>`;
        html += `<span class="field-value">${this._formatValue(value)}</span>`;
        html += `</div>`;
      }

      html += '</div>';
    }

    html += '</div>';
    return html;
  }

  _formatKey(key) {
    // Convert camelCase or snake_case to Title Case
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/^\w/, c => c.toUpperCase())
      .trim();
  }

  _formatValue(value) {
    if (value === null || value === undefined) {
      return '<span class="null">null</span>';
    }

    if (Array.isArray(value)) {
      return value.map(v => this._formatValue(v)).join(', ');
    }

    if (typeof value === 'object') {
      return this._defaultTemplate(value);
    }

    if (typeof value === 'boolean') {
      return value ? '✓' : '✗';
    }

    // Check for URLs
    if (typeof value === 'string' && value.match(/^https?:\/\//)) {
      return `<a href="${value}" target="_blank" rel="noopener">${value}</a>`;
    }

    return String(value);
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
const jsonAdapter = new JSONAdapter();

export default jsonAdapter;
export { jsonAdapter, JSONAdapter };
