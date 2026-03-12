/**
 * ══════════════════════════════════════════
 * 📄 FILE: js/plugins/SkillsSection.js
 * 🔌 MODULE TYPE: plugin
 * 📝 PURPOSE: Skills section displaying technical abilities with visual bars
 * ══════════════════════════════════════════
 */

import SectionPlugin from './SectionPlugin.js';

class SkillsSection extends SectionPlugin {
  static id = 'skills';
  static type = 'section';
  static command = 'cat skills.json | jq';
  static title = 'Skills & Technologies Espertise';
  static contentFile = 'content/skills.json';
  static order = 2;

  constructor(context) {
    super(context);
    this.skillsData = null;
  }

  async init() {
    await super.init();
    // Parse JSON content if loaded
    if (this.content && typeof this.content === 'string') {
      try {
        this.skillsData = JSON.parse(this.content);
      } catch (e) {
        this.skillsData = this._getDefaultSkills();
      }
    } else if (this.content && typeof this.content === 'object') {
      this.skillsData = this.content;
    } else {
      this.skillsData = this._getDefaultSkills();
    }
  }

  async renderContent(body) {
    const wrapper = document.createElement('div');
    wrapper.className = 'skills-content';

    // Render skill categories
    for (const category of this.skillsData.categories) {
      const categoryEl = this._createCategory(category);
      wrapper.appendChild(categoryEl);
    }

    body.appendChild(wrapper);
  }

  _createCategory(category) {
    const container = document.createElement('div');
    container.className = 'skill-category';

    const header = document.createElement('h3');
    header.className = 'category-title';
    header.innerHTML = `<span class="category-icon" aria-hidden="true">${category.icon || '◆'}</span>${category.name}`;
    container.appendChild(header);

    const skillsText = document.createElement('p');
    skillsText.className = 'skills-inline';
    
    // Create inline text with alternating colors
    const skillsHtml = category.skills.map((skill, index) => {
      const colorClass = index % 2 === 0 ? 'skill-even' : 'skill-odd';
      return `<span class="${colorClass}">${skill.name}</span>`;
    }).join('<span class="skill-separator">; </span>');
    
    skillsText.innerHTML = skillsHtml;
    container.appendChild(skillsText);
    
    return container;
  }

  onExpand() {
    this.emit('section:expanded', { id: this.constructor.id });
  }

  _getDefaultSkills() {
    return {
      categories: [
        {
          name: 'Languages',
          icon: '⟨⟩',
          skills: [
            { name: 'JavaScript/TypeScript', level: 95 },
            { name: 'Python', level: 88 },
            { name: 'Rust', level: 72 },
            { name: 'Go', level: 78 }
          ]
        },
        {
          name: 'Frontend',
          icon: '◧',
          skills: [
            { name: 'React/Next.js', level: 92 },
            { name: 'Vue.js', level: 85 },
            { name: 'CSS/Tailwind', level: 90 },
            { name: 'WebGL/Three.js', level: 68 }
          ]
        },
        {
          name: 'Backend',
          icon: '⚙',
          skills: [
            { name: 'Node.js', level: 94 },
            { name: 'PostgreSQL', level: 86 },
            { name: 'GraphQL', level: 82 },
            { name: 'Redis', level: 75 }
          ]
        },
        {
          name: 'DevOps & Tools',
          icon: '⊞',
          skills: [
            { name: 'Docker/K8s', level: 80 },
            { name: 'AWS/GCP', level: 78 },
            { name: 'CI/CD', level: 85 },
            { name: 'Git', level: 95 }
          ]
        }
      ]
    };
  }

  _getIcon() {
    return '◆';
  }
}

export default SkillsSection;
export { SkillsSection };
