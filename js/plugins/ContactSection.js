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

    // Contact form removed - using email/social links instead

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

  _createContactForm() {
    const container = document.createElement('div');
    container.className = 'contact-form-container';

    const formHeader = document.createElement('div');
    formHeader.className = 'form-header';
    formHeader.innerHTML = `
      <span class="prompt">visitor@portfolio:~$</span>
      <span class="command">./send-message.sh</span>
    `;

    const form = document.createElement('form');
    form.className = 'contact-form terminal-form';
    form.setAttribute('action', this.contactData.formAction || '#');
    form.setAttribute('method', 'POST');

    form.innerHTML = `
      <div class="form-group">
        <label for="contact-name" class="form-label">
          <span class="prompt-symbol">▸</span> name:
        </label>
        <input type="text" 
               id="contact-name" 
               name="name" 
               class="form-input"
               placeholder="Your name"
               required
               autocomplete="name">
      </div>
      
      <div class="form-group">
        <label for="contact-email" class="form-label">
          <span class="prompt-symbol">▸</span> email:
        </label>
        <input type="email" 
               id="contact-email" 
               name="email" 
               class="form-input"
               placeholder="your@email.com"
               required
               autocomplete="email">
      </div>
      
      <div class="form-group">
        <label for="contact-subject" class="form-label">
          <span class="prompt-symbol">▸</span> subject:
        </label>
        <input type="text" 
               id="contact-subject" 
               name="subject" 
               class="form-input"
               placeholder="What's this about?">
      </div>
      
      <div class="form-group">
        <label for="contact-message" class="form-label">
          <span class="prompt-symbol">▸</span> message:
        </label>
        <textarea id="contact-message" 
                  name="message" 
                  class="form-input form-textarea"
                  placeholder="Your message here..."
                  rows="4"
                  required></textarea>
      </div>
      
      <div class="form-actions">
        <button type="submit" class="form-submit">
          <span class="submit-icon" aria-hidden="true">⏎</span>
          <span class="submit-text">Send Message</span>
        </button>
        <button type="reset" class="form-reset">
          <span class="reset-icon" aria-hidden="true">×</span>
          <span class="reset-text">Clear</span>
        </button>
      </div>
      
      <div class="form-output" aria-live="polite"></div>
    `;

    form.addEventListener('submit', (e) => this._handleSubmit(e));

    container.appendChild(formHeader);
    container.appendChild(form);
    return container;
  }

  async _handleSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const output = form.querySelector('.form-output');
    const submitBtn = form.querySelector('.form-submit');

    // Show sending state
    submitBtn.disabled = true;
    output.textContent = '> Sending message...';
    output.className = 'form-output sending';

    // Simulate sending (replace with actual form submission)
    try {
      await this._delay(1500);
      
      // Success
      output.textContent = '> Message sent successfully! ✓';
      output.className = 'form-output success';
      form.reset();
      
      this.emit('contact:messageSent', {
        timestamp: Date.now()
      });

    } catch (error) {
      output.textContent = '> Error sending message. Please try again.';
      output.className = 'form-output error';
    }

    submitBtn.disabled = false;

    // Clear output after delay
    setTimeout(() => {
      output.textContent = '';
      output.className = 'form-output';
    }, 5000);
  }

  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  _getDefaultContact() {
    return {
      email: 'hello@developer.com',
      location: 'San Francisco, CA',
      availability: 'Open to opportunities',
      responseTime: 'Within 24 hours',
      formAction: '#',
      socials: [
        { name: 'GitHub', icon: '◆', url: 'https://github.com' },
        { name: 'LinkedIn', icon: '◇', url: 'https://linkedin.com' },
        { name: 'Twitter', icon: '◈', url: 'https://twitter.com' },
        { name: 'Dev.to', icon: '◉', url: 'https://dev.to' }
      ]
    };
  }

  _getIcon() {
    return '◎';
  }
}

export default ContactSection;
export { ContactSection };
