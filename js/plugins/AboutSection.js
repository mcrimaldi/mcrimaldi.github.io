/**
 * ══════════════════════════════════════════
 * 📄 FILE: js/plugins/AboutSection.js
 * 🔌 MODULE TYPE: plugin
 * 📝 PURPOSE: About section displaying personal introduction and bio
 * ══════════════════════════════════════════
 */

import SectionPlugin from './SectionPlugin.js';

class AboutSection extends SectionPlugin {
  static id = 'about';
  static type = 'section';
  static command = 'cat about.md';
  static title = 'About Me';
  static contentFile = 'content/about.md';
  static order = 1;

  constructor(context) {
    super(context);
    this.profileImage = null;
  }

  async init() {
    await super.init();
    // Profile image path - change this to use your own image
    this.profileImage = 'assets/profile.png';
  }

  async renderContent(body) {
    const wrapper = document.createElement('div');
    wrapper.className = 'about-content';

    // Profile image with CRT effects
    if (this.profileImage) {
      const imageContainer = document.createElement('div');
      imageContainer.className = 'about-profile-container';
      imageContainer.innerHTML = `
        <div class="profile-frame">
          <div class="profile-image-wrapper">
            <img src="${this.profileImage}" alt="Profile photo" class="profile-image" />
            <div class="profile-scanlines"></div>
            <div class="profile-glow"></div>
          </div>
          <div class="profile-crt-overlay"></div>
        </div>
      `;
      wrapper.appendChild(imageContainer);
    }

    // Bio content
    const bioContainer = document.createElement('div');
    bioContainer.className = 'about-bio';
    
    if (this.content) {
      bioContainer.innerHTML = this.content;
    } else {
      bioContainer.innerHTML = this._getDefaultContent();
    }

    wrapper.appendChild(bioContainer);

    // Quick facts
    const facts = this._createQuickFacts();
    wrapper.appendChild(facts);

    body.appendChild(wrapper);
  }

  // Profile image is loaded in init() - set this.profileImage path there

  _createQuickFacts() {
    const container = document.createElement('div');
    container.className = 'about-facts';
    
    // ═══════════════════════════════════════════════════════════════
    // QUICK FACTS - Modify these values to match your profile
    // Set to empty array [] to hide this section entirely
    // ═══════════════════════════════════════════════════════════════
    const facts = [
      { label: 'Institution', value: 'Università degli Studi di Napoli Federico II', icon: '◈' },
      { label: 'Department', value: 'Agricultural Sciences', icon: '◆' },
      { label: 'Role', value: 'Scientific and Technologic Officer', icon: '◉' },
      { label: 'Location', value: 'Portici (NA), Italy', icon: '◇' }
    ];
    // ═══════════════════════════════════════════════════════════════

    // If no facts, return empty container
    if (!facts || facts.length === 0) {
      return container;
    }

    const list = document.createElement('ul');
    list.className = 'facts-list';
    list.setAttribute('role', 'list');

    facts.forEach(fact => {
      const item = document.createElement('li');
      item.className = 'fact-item';
      item.innerHTML = `
        <span class="fact-icon" aria-hidden="true">${fact.icon}</span>
        <span class="fact-label">${fact.label}:</span>
        <span class="fact-value">${fact.value}</span>
      `;
      list.appendChild(item);
    });

    container.appendChild(list);
    return container;
  }

  _getDefaultContent() {
    return `
      <p class="intro-line">Hello, World! <span class="wave" aria-hidden="true">👋</span></p>
      <p>I'm a passionate full-stack developer with a love for creating elegant, 
      performant, and user-friendly web applications. With over 8 years of experience 
      in the industry, I've worked on everything from small startups to large enterprise 
      applications.</p>
      <p>My approach combines clean code architecture with modern development practices, 
      ensuring that every project is maintainable, scalable, and built to last.</p>
    `;
  }

  _getIcon() {
    return '◈';
  }

  onExpand() {
    // Add CRT flicker effect on expand
    const imageWrapper = this.container?.querySelector('.profile-image-wrapper');
    if (imageWrapper) {
      imageWrapper.classList.add('crt-activate');
      setTimeout(() => imageWrapper.classList.remove('crt-activate'), 500);
    }
  }
}

export default AboutSection;
export { AboutSection };
