/**
 * ══════════════════════════════════════════
 * 📄 FILE: js/adapters/MarkdownAdapter.js
 * 🔌 MODULE TYPE: adapter
 * 📝 PURPOSE: Load and parse Markdown content files
 * ══════════════════════════════════════════
 */

import eventBus from '../core/EventBus.js';
import config from '../core/Config.js';

class MarkdownAdapter {
  static type = 'markdown';

  constructor() {
    this.cache = new Map();
    this.cacheTTL = 300000; // 5 minutes default
  }

  init() {
    this.cacheTTL = config.get('content.cacheTTL', 300000);
  }

  /**
   * Load and parse a markdown file
   * @param {string} path - Path to markdown file
   * @returns {Promise<string>} Parsed HTML content
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

      const markdown = await response.text();
      const html = this.parse(markdown);

      // Cache the result
      this._setCache(path, html);

      return html;

    } catch (error) {
      console.error(`[MarkdownAdapter] Failed to load "${path}":`, error);
      eventBus.emit('error:occurred', { 
        source: 'MarkdownAdapter', 
        error,
        path 
      });
      throw error;
    }
  }

  /**
   * Parse markdown string to HTML
   * @param {string} markdown - Markdown content
   * @returns {string} HTML content
   */
  parse(markdown) {
    let html = markdown;

    // Escape HTML entities first
    html = this._escapeHtml(html);

    // Code blocks (before other parsing)
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
      const langClass = lang ? ` class="language-${lang}"` : '';
      return `<pre><code${langClass}>${code.trim()}</code></pre>`;
    });

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Headers
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    // Bold
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');

    // Italic
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    html = html.replace(/_([^_]+)_/g, '<em>$1</em>');

    // Strikethrough
    html = html.replace(/~~([^~]+)~~/g, '<del>$1</del>');

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, 
      '<a href="$2" target="_blank" rel="noopener">$1</a>');

    // Images
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, 
      '<img src="$2" alt="$1" loading="lazy">');

    // Horizontal rules
    html = html.replace(/^(-{3,}|\*{3,}|_{3,})$/gm, '<hr>');

    // Blockquotes
    html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');
    // Merge consecutive blockquotes
    html = html.replace(/<\/blockquote>\n<blockquote>/g, '\n');

    // Unordered lists
    html = this._parseUnorderedLists(html);

    // Ordered lists
    html = this._parseOrderedLists(html);

    // Paragraphs (lines that aren't already wrapped)
    html = this._parseParagraphs(html);

    // Clean up extra whitespace
    html = html.replace(/\n{3,}/g, '\n\n');

    return html.trim();
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

  _escapeHtml(text) {
    // Don't escape everything - just the dangerous characters
    // but preserve markdown syntax
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  _parseUnorderedLists(html) {
    const lines = html.split('\n');
    let inList = false;
    const result = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const listMatch = line.match(/^[\s]*[-*+] (.+)$/);

      if (listMatch) {
        if (!inList) {
          result.push('<ul>');
          inList = true;
        }
        result.push(`<li>${listMatch[1]}</li>`);
      } else {
        if (inList) {
          result.push('</ul>');
          inList = false;
        }
        result.push(line);
      }
    }

    if (inList) {
      result.push('</ul>');
    }

    return result.join('\n');
  }

  _parseOrderedLists(html) {
    const lines = html.split('\n');
    let inList = false;
    const result = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const listMatch = line.match(/^[\s]*\d+\. (.+)$/);

      if (listMatch) {
        if (!inList) {
          result.push('<ol>');
          inList = true;
        }
        result.push(`<li>${listMatch[1]}</li>`);
      } else {
        if (inList) {
          result.push('</ol>');
          inList = false;
        }
        result.push(line);
      }
    }

    if (inList) {
      result.push('</ol>');
    }

    return result.join('\n');
  }

  _parseParagraphs(html) {
    const lines = html.split('\n\n');
    
    return lines.map(block => {
      block = block.trim();
      
      // Skip if already wrapped in block element
      if (block.match(/^<(h[1-6]|p|ul|ol|li|pre|blockquote|hr|div)/)) {
        return block;
      }

      // Skip if empty
      if (!block) return '';

      // Wrap in paragraph
      return `<p>${block.replace(/\n/g, '<br>')}</p>`;
    }).join('\n\n');
  }

  _getFromCache(path) {
    const cached = this.cache.get(path);
    if (!cached) return null;

    // Check if cache is still valid
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
const markdownAdapter = new MarkdownAdapter();

export default markdownAdapter;
export { markdownAdapter, MarkdownAdapter };
