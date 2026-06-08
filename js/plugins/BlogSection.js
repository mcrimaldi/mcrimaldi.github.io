import { SectionPlugin } from './SectionPlugin.js';

/**
 * Blog Section - Shows latest blog posts with link to full blog
 */
export class BlogSection extends SectionPlugin {
  // Plugin metadata
  static id = 'blog';
  static type = 'section';
  static command = 'ls ~/blog/';
  static title = 'Blog';
  static contentFile = 'blog/posts.json';
  static order = 6;

  constructor(context) {
    super(context);
    this.postsData = null;
  }

  async init() {
    await super.init();

    let data = {};
    if (this.content && typeof this.content === 'string') {
      try { data = JSON.parse(this.content); } catch (e) { data = {}; }
    } else if (this.content && typeof this.content === 'object') {
      data = this.content;
    }

    this.postsData = (data.posts || []).sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  async renderContent(body) {
    const wrapper = document.createElement('div');
    wrapper.className = 'blog-section-content';

    if (!this.postsData || this.postsData.length === 0) {
      wrapper.innerHTML = `
        <p style="color: var(--terminal-text-dim);">No posts yet. Stay tuned!</p>
        <a href="blog/" class="blog-view-all">→ Go to Blog</a>
      `;
      body.appendChild(wrapper);
      return;
    }

    // Show latest 3 posts
    const latestPosts = this.postsData.slice(0, 3);

    const postsHtml = latestPosts.map(post => `
      <div class="blog-preview-item">
        <span class="blog-preview-date">${post.date}</span>
        <a href="blog/#${post.id}" class="blog-preview-title">${post.title}</a>
        <p class="blog-preview-summary">${post.summary}</p>
        ${post.tags ? `<div class="blog-preview-tags">${post.tags.map(t => `<span class="blog-preview-tag">${t}</span>`).join('')}</div>` : ''}
      </div>
    `).join('');

    wrapper.innerHTML = `
      ${postsHtml}
      <a href="blog/" class="blog-view-all">→ View all posts (${this.postsData.length})</a>
    `;

    body.appendChild(wrapper);
  }

  onExpand() {
    this.emit('section:expanded', { id: this.constructor.id });
  }
}
