/**
 * ══════════════════════════════════════════
 * 📄 FILE: js/plugins/ContactSection.js
 * 🔌 MODULE TYPE: plugin
 * 📝 PURPOSE: Contact section with social links and contact form
 * ══════════════════════════════════════════
 */

import SectionPlugin from './SectionPlugin.js';

class ContactSection extends SectionPlugin {
  static id = 'contact';
  static type = 'section';
  static command = 'cat ~/.contact/info.txt';
  static title = 'Contact';
  static contentFile = 'content/contact.json';
  static order = 6;

  constructor(context) {
    super(context);
    this.contactData = null;
  }

  async init() {
    await super.init();
    if (this.content && typeof this.content === 'string') {
      try {
        this.contactData = JSON.parse(this.content);
      } catch (e) {
        this.contactData = this._getDefaultContact();
      }
    } else if (this.content && typeof this.content === 'object') {
      this.contactData = this.content;
    } else {
      this.contactData = this._getDefaultContact();
    }
  }

  async renderContent(body) {
    const wrapper = document.createElement('div');
    wrapper.className = 'contact-content';

    // ASCII mail art
    const mailArt = this._createMailArt();
    wrapper.appendChild(mailArt);

    // Contact info grid
    const infoGrid = this._createInfoGrid();
    wrapper.appendChild(infoGrid);

    // Social links
    const socialLinks = this._createSocialLinks();
    wrapper.appendChild(socialLinks);

    // Contact form (terminal style)
    const form = this._createContactForm();
    wrapper.appendChild(form);

    body.appendChild(wrapper);
  }

  _createMailArt() {
    const container = document.createElement('div');
    container.className = 'mail-art';
    container.setAttribute('aria-hidden', 'true');
    container.innerHTML = `<pre>
    ╔═══════════════════════════════════╗
    ║  ┌─────────────────────────────┐  ║
    ║  │     📨  GET IN TOUCH  📨    │  ║
    ║  └─────────────────────────────┘  ║
    ║    Let's build something great    ║
    ╚═══════════════════════════════════╝
</pre>`;
    return container;
  }

  _createInfoGrid() {
    const grid = document.createElement('div');
    grid.className = 'info-grid';

    // Support both flat structure and nested "info" object
    const info = this.contactData?.info || this.contactData || {};
    
    const items = [
      { icon: '◈', label: 'Email', value: info.email, href: info.email ? `mailto:${info.email}` : null },
      { icon: '◉', label: 'Location', value: info.location },
      { icon: '◇', label: 'Availability', value: info.availability },
      { icon: '◆', label: 'Response Time', value: info.responseTime }
    ];

    items.forEach(item => {
      if (!item.value) return; // Skip items without values
      
      const el = document.createElement('div');
      el.className = 'info-item';
      
      if (item.href) {
        el.innerHTML = `
          <span class="info-icon" aria-hidden="true">${item.icon}</span>
          <span class="info-label">${item.label}:</span>
          <a href="${item.href}" class="info-value info-link">${item.value}</a>
        `;
      } else {
        el.innerHTML = `
          <span class="info-icon" aria-hidden="true">${item.icon}</span>
          <span class="info-label">${item.label}:</span>
          <span class="info-value">${item.value}</span>
        `;
      }
      
      grid.appendChild(el);
    });

    return grid;
  }

  _createSocialLinks() {
    const container = document.createElement('div');
    container.className = 'social-links';

    const label = document.createElement('span');
    label.className = 'social-label';
    label.textContent = 'Connect:';
    container.appendChild(label);

    const linksContainer = document.createElement('div');
    linksContainer.className = 'social-links-list';

    // Support both "socials" and "social" keys
    const socials = this.contactData?.socials || this.contactData?.social || [];
    
    if (socials && socials.length > 0) {
      socials.forEach(social => {
        const link = document.createElement('a');
        link.href = social.url || '#';
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.className = 'social-link';
        link.setAttribute('aria-label', social.platform || social.name || 'Social link');
        link.innerHTML = `
          <span class="social-icon" aria-hidden="true">${social.icon || '◉'}</span>
          <span class="social-name">${social.platform || social.name || 'Link'}</span>
        `;
        linksContainer.appendChild(link);
      });
    }

    container.appendChild(linksContainer);
    return container;
  }


}

export default ContactSection;
export { ContactSection };
